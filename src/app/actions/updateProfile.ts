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
