"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ContentBlock } from "@/components/profile/ContentBlocks";

export interface CreatePortfolioPieceInput {
  title: string;
  content: string;
  // Bloques estructurados del Canvas; se guardan tal cual para poder
  // reabrirlos en modo edición sin depender de parsear el Markdown.
  contentBlocks?: ContentBlock[];
  category?: string;
  // Data URL (sin bucket de Storage todavía, igual que gallery)
  coverUrl?: string;
  downloadUrl?: string;
  resourcePassword?: string;
  isPublic: boolean;
  // URLs (o data URLs) de los archivos adjuntados desde el editor
  gallery?: string[];
  // Máx. 5, validado abajo
  tags?: string[];
  // Usernames de colaboradores, sin validar contra la tabla User todavía
  collaborators?: string[];
  releaseDate?: Date;
}

export interface UpdatePortfolioPieceInput extends CreatePortfolioPieceInput {}

export interface PortfolioPieceForEdit {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  contentBlocks: ContentBlock[];
  tags: string[];
  collaborators: string[];
  releaseDate: string | null;
  isPublic: boolean;
  gallery: string[];
  downloadUrl: string;
  resourcePassword: string;
}

const MAX_TAGS = 5;

// Crea una pieza de portafolio desde el editor de Markdown del Partner.
// El contenido se guarda como texto plano; siempre queda ligada al usuario
// autenticado vía Clerk, nunca a un userId recibido del cliente.
export async function createPortfolioPiece(input: CreatePortfolioPieceInput): Promise<{ id: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const title = input.title.trim();
  const content = input.content.trim();
  if (!title) throw new Error("El título es obligatorio");
  if (!content) throw new Error("El contenido es obligatorio");

  const piece = await prisma.portfolioPiece.create({
    data: {
      title,
      markdownContent: content,
      contentBlocks: input.contentBlocks ? (input.contentBlocks as object) : undefined,
      category: input.category?.trim() || undefined,
      coverUrl: input.coverUrl || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      resourcePassword: input.resourcePassword?.trim() || null,
      isPublic: input.isPublic,
      gallery: input.gallery && input.gallery.length > 0 ? input.gallery : undefined,
      tags: (input.tags ?? []).slice(0, MAX_TAGS),
      collaborators: input.collaborators ?? [],
      releaseDate: input.releaseDate ?? null,
      userId,
    },
    select: { id: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user?.username) revalidatePath(`/${user.username}`);
  revalidatePath("/explorar");
  revalidatePath("/");

  return { id: piece.id };
}

// Trae una pieza completa para precargar el Canvas en modo edición.
// Solo el dueño puede leerla (incluye borradores).
export async function getPortfolioPieceForEdit(pieceId: string): Promise<PortfolioPieceForEdit> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const piece = await prisma.portfolioPiece.findUnique({
    where: { id: pieceId },
    select: {
      id: true,
      title: true,
      category: true,
      coverUrl: true,
      contentBlocks: true,
      tags: true,
      collaborators: true,
      releaseDate: true,
      isPublic: true,
      gallery: true,
      downloadUrl: true,
      resourcePassword: true,
      userId: true,
    },
  });
  if (!piece || piece.userId !== userId) throw new Error("No autorizado");

  return {
    id: piece.id,
    title: piece.title,
    category: piece.category,
    coverUrl: piece.coverUrl ?? "",
    contentBlocks: Array.isArray(piece.contentBlocks) ? (piece.contentBlocks as unknown as ContentBlock[]) : [],
    tags: piece.tags,
    collaborators: piece.collaborators,
    releaseDate: piece.releaseDate ? piece.releaseDate.toISOString() : null,
    isPublic: piece.isPublic,
    gallery: Array.isArray(piece.gallery) ? (piece.gallery as unknown as string[]) : [],
    downloadUrl: piece.downloadUrl ?? "",
    resourcePassword: piece.resourcePassword ?? "",
  };
}

// Actualiza una pieza existente desde el Canvas. Mismas reglas que crear:
// solo el dueño puede editarla, nunca se confía en un userId del cliente.
export async function updatePortfolioPiece(
  pieceId: string,
  input: UpdatePortfolioPieceInput,
): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const title = input.title.trim();
  const content = input.content.trim();
  if (!title) throw new Error("El título es obligatorio");
  if (!content) throw new Error("El contenido es obligatorio");

  const existing = await prisma.portfolioPiece.findUnique({
    where: { id: pieceId },
    select: { userId: true, user: { select: { username: true } } },
  });
  if (!existing || existing.userId !== userId) throw new Error("No autorizado");

  await prisma.portfolioPiece.update({
    where: { id: pieceId },
    data: {
      title,
      markdownContent: content,
      contentBlocks: input.contentBlocks ? (input.contentBlocks as object) : undefined,
      category: input.category?.trim() || undefined,
      coverUrl: input.coverUrl || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      resourcePassword: input.resourcePassword?.trim() || null,
      isPublic: input.isPublic,
      gallery: input.gallery && input.gallery.length > 0 ? input.gallery : undefined,
      tags: (input.tags ?? []).slice(0, MAX_TAGS),
      collaborators: input.collaborators ?? [],
      releaseDate: input.releaseDate ?? null,
    },
  });

  if (existing.user.username) revalidatePath(`/${existing.user.username}`);
  revalidatePath("/explorar");
  revalidatePath("/");
}

// Elimina una pieza. Irreversible: sin soft-delete, coherente con el aviso
// que se muestra antes de confirmar en el diálogo del cliente.
export async function deletePortfolioPiece(pieceId: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const piece = await prisma.portfolioPiece.findUnique({
    where: { id: pieceId },
    select: { userId: true, user: { select: { username: true } } },
  });
  if (!piece || piece.userId !== userId) throw new Error("No autorizado");

  await prisma.portfolioPiece.delete({ where: { id: pieceId } });

  if (piece.user.username) revalidatePath(`/${piece.user.username}`);
  revalidatePath("/explorar");
  revalidatePath("/");
}

// Cambia la visibilidad de una pieza (público ↔ borrador).
// Solo el dueño de la pieza puede modificarla.
export async function setPieceVisibility(pieceId: string, isPublic: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const piece = await prisma.portfolioPiece.findUnique({
    where: { id: pieceId },
    select: { userId: true, user: { select: { username: true } } },
  });
  if (!piece || piece.userId !== userId) throw new Error("No autorizado");

  await prisma.portfolioPiece.update({
    where: { id: pieceId },
    data: { isPublic },
  });

  // Los borradores desaparecen de perfil público, Explorar y Home.
  if (piece.user.username) revalidatePath(`/${piece.user.username}`);
  revalidatePath("/explorar");
  revalidatePath("/");
}
