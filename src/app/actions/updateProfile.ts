"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface ProfileInfoInput {
  whatsapp: string;
  secondaryEmail: string;
  address: string;
  company: string;
  brand: string;
  motto: string;
}

const MAX_MOTTO_WORDS = 15;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Actualiza la información editable del perfil del cliente.
export async function updateProfileInfo(input: ProfileInfoInput): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const motto = clean(input.motto);
  if (motto && motto.split(/\s+/).length > MAX_MOTTO_WORDS) {
    throw new Error(`El lema no puede exceder ${MAX_MOTTO_WORDS} palabras.`);
  }

  const secondaryEmail = clean(input.secondaryEmail);
  if (secondaryEmail && !EMAIL_RE.test(secondaryEmail)) {
    throw new Error("El segundo correo electrónico no es válido.");
  }

  let user;
  try {
    user = await prisma.user.update({
      where: { id: userId },
      data: {
        whatsapp: clean(input.whatsapp),
        secondaryEmail,
        address: clean(input.address),
        company: clean(input.company),
        brand: clean(input.brand),
        motto,
      },
    });
  } catch (error) {
    console.error("updateProfileInfo:", error);
    throw new Error("No se pudieron guardar los cambios. Intenta de nuevo.");
  }

  if (user.username) revalidatePath(`/${user.username}`);
}

// Sin bucket de Storage disponible: la portada viaja como data URL JPEG ya
// comprimida en el cliente. El límite protege el peso de la fila en BD.
const MAX_COVER_DATA_URL_CHARS = 700_000; // ≈ 500KB de imagen

async function requirePartner(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, username: true },
  });
  if (!user || user.role !== "collaborator") throw new Error("Solo disponible para Partners.");
  return user;
}

// Actualiza (o quita, con null) la imagen de portada del perfil de Partner.
export async function updateCoverImage(dataUrl: string | null): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");
  const partner = await requirePartner(userId);

  if (dataUrl !== null) {
    if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
      throw new Error("Formato de imagen no válido.");
    }
    if (dataUrl.length > MAX_COVER_DATA_URL_CHARS) {
      throw new Error("La imagen de portada es demasiado pesada.");
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { coverImageUrl: dataUrl } });
  if (partner.username) revalidatePath(`/${partner.username}`);
}

// Visibilidad del Partner en Explorar/designerds. El perfil directo por
// username sigue siendo accesible aunque sea privado.
export async function updatePartnerVisibility(isPublic: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");
  const partner = await requirePartner(userId);

  await prisma.user.update({ where: { id: userId }, data: { isPublic } });
  if (partner.username) revalidatePath(`/${partner.username}`);
  revalidatePath("/explorar/designerds");
}

// Tras user.setProfileImage() en el cliente, Clerk ya tiene la imagen nueva;
// esto copia la URL resultante a la BD para que el perfil no quede desfasado.
export async function syncProfileImage(): Promise<void> {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("No autenticado");

  const user = await prisma.user.update({
    where: { id: clerkUser.id },
    data: { imageUrl: clerkUser.imageUrl },
  });

  if (user.username) revalidatePath(`/${user.username}`);
}
