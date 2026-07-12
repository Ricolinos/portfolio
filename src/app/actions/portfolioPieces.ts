"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import type { ContentBlock } from "@/components/profile/ContentBlocks";
import { isValidPieceCategory } from "@/lib/pieceCategories";
import { prisma } from "@/lib/prisma";

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
  // Máx. 5, validado abajo. LEGACY: el editor nuevo usa `subcategories`.
  tags?: string[];
  // Subcategorías libres de la pieza (máx. 10, validado abajo). Al menos 1
  // es obligatoria para publicar (isPublic true); los borradores no la exigen.
  subcategories?: string[];
  // Software/herramientas usadas en la pieza (máx. 15, validado abajo)
  software?: string[];
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
  subcategories: string[];
  software: string[];
  collaborators: string[];
  releaseDate: string | null;
  isPublic: boolean;
  gallery: string[];
  downloadUrl: string;
  resourcePassword: string;
}

const MAX_TAGS = 5;
const MAX_SUBCATEGORIES = 10;
const MAX_SOFTWARE = 15;
const MAX_TAXONOMY_LABEL_LENGTH = 30;
const MAX_PARTNER_RESULTS = 24;
const MAX_SUBCATEGORY_SUGGESTIONS = 8;
// Piezas públicas escaneadas para armar sugerencias de autocompletado
// (getSubcategorySuggestions); dev-simple, sin caché ni índice dedicado.
const SUBCATEGORY_SUGGESTION_SCAN_LIMIT = 200;

// Normaliza una lista de etiquetas libres (subcategories/software): recorta
// espacios, descarta vacías/demasiado largas, deduplica sin distinguir
// mayúsculas/minúsculas (conserva la primera variante de capitalización) y
// aplica el máximo de elementos.
function normalizeTaxonomyList(values: string[] | undefined, max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values ?? []) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MAX_TAXONOMY_LABEL_LENGTH) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) break;
  }
  return result;
}

export interface PublicPartnerResult {
  id: string;
  username: string;
  name: string | null;
  imageUrl: string | null;
  headline: string | null;
  primaryRole: string | null;
}

// Busca partners públicos por nombre/username/headline/rol para la
// herramienta "Colaboradores" del Canvas Markdown. Requiere sesión: solo
// usuarios logueados (client o collaborator) pueden buscar para etiquetar
// colaboradores en una pieza de portafolio.
export async function searchPublicPartners(
  query: string,
  limit = 12,
): Promise<PublicPartnerResult[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const take = Math.min(Math.max(limit, 1), MAX_PARTNER_RESULTS);
  const q = query.trim();

  const partners = await prisma.user.findMany({
    where: {
      role: "collaborator",
      isPublic: true,
      username: { not: null },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { headline: { contains: q, mode: "insensitive" } },
              { primaryRole: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      username: true,
      name: true,
      imageUrl: true,
      headline: true,
      primaryRole: true,
    },
    take,
  });

  return partners
    .filter(
      (partner): partner is typeof partner & { username: string } => partner.username !== null,
    )
    .map((partner) => ({
      id: partner.id,
      username: partner.username,
      name: partner.name,
      imageUrl: partner.imageUrl,
      headline: partner.headline,
      primaryRole: partner.primaryRole,
    }));
}

// Valida category/subcategories entrantes y devuelve los valores ya
// normalizados listos para persistir. Se usa en create y update:
// - category: si viene, debe pertenecer a PIECE_CATEGORIES (piezas viejas
//   con categoría fuera de la lista no se tocan si el cliente no manda una).
// - subcategories: al menos 1 es obligatoria para publicar (isPublic true);
//   los borradores (isPublic false) pueden guardarse sin ninguna.
function validatePieceTaxonomy(input: CreatePortfolioPieceInput) {
  const category = input.category?.trim();
  if (category && !isValidPieceCategory(category)) {
    throw new Error(`Categoría inválida: "${category}"`);
  }

  const subcategories = normalizeTaxonomyList(input.subcategories, MAX_SUBCATEGORIES);
  if (input.isPublic && subcategories.length === 0) {
    throw new Error("Agrega al menos una subcategoría antes de publicar");
  }

  const software = normalizeTaxonomyList(input.software, MAX_SOFTWARE);

  return { category, subcategories, software };
}

// Crea una pieza de portafolio desde el editor de Markdown del Partner.
// El contenido se guarda como texto plano; siempre queda ligada al usuario
// autenticado vía Clerk, nunca a un userId recibido del cliente.
export async function createPortfolioPiece(
  input: CreatePortfolioPieceInput,
): Promise<{ id: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const title = input.title.trim();
  const content = input.content.trim();
  if (!title) throw new Error("El título es obligatorio");
  if (!content) throw new Error("El contenido es obligatorio");

  const { category, subcategories, software } = validatePieceTaxonomy(input);

  const piece = await prisma.portfolioPiece.create({
    data: {
      title,
      markdownContent: content,
      contentBlocks: input.contentBlocks ? (input.contentBlocks as object) : undefined,
      category: category || undefined,
      coverUrl: input.coverUrl || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      resourcePassword: input.resourcePassword?.trim() || null,
      isPublic: input.isPublic,
      gallery: input.gallery && input.gallery.length > 0 ? input.gallery : undefined,
      tags: (input.tags ?? []).slice(0, MAX_TAGS),
      subcategories,
      software,
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
      subcategories: true,
      software: true,
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
    contentBlocks: Array.isArray(piece.contentBlocks)
      ? (piece.contentBlocks as unknown as ContentBlock[])
      : [],
    tags: piece.tags,
    subcategories: piece.subcategories,
    software: piece.software,
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

  const { category, subcategories, software } = validatePieceTaxonomy(input);

  await prisma.portfolioPiece.update({
    where: { id: pieceId },
    data: {
      title,
      markdownContent: content,
      contentBlocks: input.contentBlocks ? (input.contentBlocks as object) : undefined,
      category: category || undefined,
      coverUrl: input.coverUrl || null,
      downloadUrl: input.downloadUrl?.trim() || null,
      resourcePassword: input.resourcePassword?.trim() || null,
      isPublic: input.isPublic,
      gallery: input.gallery && input.gallery.length > 0 ? input.gallery : undefined,
      tags: (input.tags ?? []).slice(0, MAX_TAGS),
      subcategories,
      software,
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

// Sugerencias de autocompletado para el campo "subcategorías" del editor:
// subcategorías ya usadas en piezas PÚBLICAS de cualquier usuario que
// empiecen o contengan `query`. Prisma no soporta distinct sobre columnas
// array, así que se trae un lote razonable de piezas públicas y se
// aplana/dedup/filtra en memoria — dev-simple, sin caché.
export async function getSubcategorySuggestions(
  query: string,
  limit = MAX_SUBCATEGORY_SUGGESTIONS,
): Promise<string[]> {
  const q = query.trim().toLowerCase();
  const take = Math.min(Math.max(limit, 1), MAX_SUBCATEGORY_SUGGESTIONS);

  const pieces = await prisma.portfolioPiece.findMany({
    where: { isPublic: true, subcategories: { isEmpty: false } },
    select: { subcategories: true },
    orderBy: { createdAt: "desc" },
    take: SUBCATEGORY_SUGGESTION_SCAN_LIMIT,
  });

  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const piece of pieces) {
    for (const subcategory of piece.subcategories) {
      const key = subcategory.toLowerCase();
      if (seen.has(key)) continue;
      if (q && !key.includes(q)) continue;
      seen.add(key);
      suggestions.push(subcategory);
      if (suggestions.length >= take) return suggestions;
    }
  }
  return suggestions;
}
