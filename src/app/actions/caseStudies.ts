"use server";

import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { slugifyTitle } from "@/lib/caseStudies";
import {
  buildCaseStudyMdx,
  countSections,
  MAX_CAROUSEL_IMAGES,
  SECTION_LABELS,
  SECTION_LIMITS,
  type CaseStudyDraft,
  type CollaboratorRef,
  type SectionKind,
} from "@/lib/caseStudyBuilder";

// Solo imágenes (incluye gif animado); los bytes viven en MediaFile.data
// y se sirven por /api/media/[id] por falta de bucket de Storage.
const ALLOWED_MIME = /^image\/(png|jpe?g|gif|webp|avif)$/;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_SUMMARY_CHARS = 200;

async function requirePartner() {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, role: true },
  });
  if (!user || user.role !== "collaborator") {
    throw new Error("Solo los Partners pueden publicar proyectos.");
  }
  if (!user.username) {
    throw new Error("Tu cuenta aún no tiene nombre de usuario.");
  }
  return { id: user.id, username: user.username };
}

// Sube una imagen del panel (data URL) y devuelve la URL pública que se
// incrustará en el markdown. Se llama una vez por imagen al seleccionarla.
export async function uploadCaseStudyMedia(
  dataUrl: string,
  fileName: string,
): Promise<{ url: string }> {
  const user = await requirePartner();

  const match = /^data:([a-z0-9./+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("El archivo no es una imagen válida.");
  const [, mimeType, base64] = match;
  if (!ALLOWED_MIME.test(mimeType)) {
    throw new Error("Formato no soportado: sube imágenes o GIFs.");
  }
  const fileSize = Math.floor((base64.length * 3) / 4);
  if (fileSize > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el máximo de 4MB.");
  }

  const id = randomUUID();
  const url = `/api/media/${id}`;
  await prisma.mediaFile.create({
    data: {
      id,
      fileName: fileName.slice(0, 200) || "imagen",
      fileType: mimeType,
      fileUrl: url,
      fileSize,
      data: base64,
      userId: user.id,
    },
  });

  return { url };
}

// Búsqueda de usuarios por nombre de usuario para la sección de colaboradores.
export async function searchCollaborators(query: string): Promise<CollaboratorRef[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const term = query.trim();
  if (term.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      username: { not: null, contains: term, mode: "insensitive" },
    },
    select: { username: true, name: true, imageUrl: true },
    orderBy: { username: "asc" },
    take: 8,
  });

  return users.map((u) => ({ username: u.username!, name: u.name, imageUrl: u.imageUrl }));
}

function validateDraft(draft: CaseStudyDraft) {
  const counts = countSections(draft.sections);
  for (const kind of Object.keys(SECTION_LIMITS) as SectionKind[]) {
    if (counts[kind] > SECTION_LIMITS[kind]) {
      throw new Error(
        `Máximo ${SECTION_LIMITS[kind]} de "${SECTION_LABELS[kind]}" por proyecto.`,
      );
    }
  }

  const titulo = draft.sections.find((s) => s.kind === "titulo");
  if (!titulo || titulo.kind !== "titulo" || titulo.text.trim() === "") {
    throw new Error("El proyecto necesita un título.");
  }
  const portada = draft.sections.find((s) => s.kind === "portada");
  if (!portada || portada.kind !== "portada" || !portada.src) {
    throw new Error("El proyecto necesita una imagen de portada.");
  }
  if (draft.category.trim() === "") {
    throw new Error("Elige una categoría para el proyecto.");
  }

  for (const section of draft.sections) {
    if (section.kind === "subtitulo" && section.text.trim() === "") {
      throw new Error("Hay un subtítulo vacío.");
    }
    if (section.kind === "texto" && section.text.trim() === "") {
      throw new Error("Hay un bloque de texto vacío.");
    }
    if (
      section.kind === "carousel" &&
      (section.images.length === 0 || section.images.length > MAX_CAROUSEL_IMAGES)
    ) {
      throw new Error(`Cada carousel necesita entre 1 y ${MAX_CAROUSEL_IMAGES} imágenes.`);
    }
    if (section.kind === "comparador" && (!section.left || !section.right)) {
      throw new Error("Cada comparador necesita sus dos imágenes.");
    }
  }

  return { title: titulo.text.trim(), cover: portada.src };
}

// Crea la pieza de portafolio con su caso de estudio MDX ligado al Partner.
// isPublic=false la deja en borradores: visible solo en el perfil propio.
export async function createCaseStudy(
  draft: CaseStudyDraft,
): Promise<{ href: string }> {
  const user = await requirePartner();
  const { title, cover } = validateDraft(draft);

  // Los colaboradores se resuelven contra la BD: usernames inexistentes se
  // descartan en lugar de terminar como avatares rotos en el markdown.
  const usernames =
    draft.sections.find((s) => s.kind === "colaboradores")?.kind === "colaboradores"
      ? (draft.sections.find((s) => s.kind === "colaboradores") as {
          usernames: string[];
        }).usernames
      : [];
  const collaborators: CollaboratorRef[] = usernames.length
    ? (
        await prisma.user.findMany({
          where: { username: { in: usernames } },
          select: { username: true, name: true, imageUrl: true },
        })
      ).map((u) => ({ username: u.username!, name: u.name, imageUrl: u.imageUrl }))
    : [];

  const firstText = draft.sections.find((s) => s.kind === "texto");
  const summary =
    firstText?.kind === "texto"
      ? firstText.text.trim().replace(/\s+/g, " ").slice(0, MAX_SUMMARY_CHARS)
      : title;

  const mdx = buildCaseStudyMdx({
    draft,
    title,
    summary,
    cover,
    publishedAt: new Date().toISOString().slice(0, 10),
    collaborators,
  });

  // Slug único por Partner: si el título se repite se sufija -2, -3, …
  const base = slugifyTitle(title) || "proyecto";
  let slug = base;
  for (let i = 2; ; i++) {
    const clash = await prisma.portfolioPiece.findFirst({
      where: { userId: user.id, slug },
      select: { id: true },
    });
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  await prisma.portfolioPiece.create({
    data: {
      title,
      description: summary,
      category: draft.category.trim(),
      coverUrl: cover,
      slug,
      caseStudy: mdx,
      isPublic: draft.isPublic,
      userId: user.id,
    },
  });

  revalidatePath(`/${user.username}`);
  revalidatePath(`/${user.username}/proyecto/${slug}`);
  revalidatePath("/explorar");
  revalidatePath("/");

  return { href: `/${user.username}/proyecto/${slug}` };
}
