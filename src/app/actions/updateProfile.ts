"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { validateExternalUrl } from "@/lib/externalLink";

export interface ProfileInfoInput {
  whatsapp: string;
  secondaryEmail: string;
  address: string;
  company: string;
  brand: string;
  motto: string;
  // Opcionales: la UI existente (EditInfoDialog) aún no los expone; se
  // agregan de forma retrocompatible para el nuevo formulario "Editar perfil".
  contactPreference?: string;
  contactHours?: string;
  website?: string;
  industry?: string;
}

const MAX_MOTTO_WORDS = 15;
const MAX_CONTACT_HOURS_CHARS = 60;
const MAX_INDUSTRY_CHARS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
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

  const contactPreferenceInput = clean(input.contactPreference);
  if (
    contactPreferenceInput &&
    contactPreferenceInput !== "whatsapp" &&
    contactPreferenceInput !== "email"
  ) {
    throw new Error("La preferencia de contacto no es válida.");
  }

  const contactHours = clean(input.contactHours);
  if (contactHours && contactHours.length > MAX_CONTACT_HOURS_CHARS) {
    throw new Error(`El horario de contacto no puede exceder ${MAX_CONTACT_HOURS_CHARS} caracteres.`);
  }

  const industry = clean(input.industry);
  if (industry && industry.length > MAX_INDUSTRY_CHARS) {
    throw new Error(`El giro/industria no puede exceder ${MAX_INDUSTRY_CHARS} caracteres.`);
  }

  const websiteInput = clean(input.website);
  const website = websiteInput ? validateExternalUrl(websiteInput) : null;
  if (websiteInput && !website) {
    throw new Error("El sitio web no es una URL válida.");
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
        contactPreference: contactPreferenceInput,
        contactHours,
        website,
        industry,
      },
    });
  } catch (error) {
    console.error("updateProfileInfo:", error);
    throw new Error("No se pudieron guardar los cambios. Intenta de nuevo.");
  }

  if (user.username) revalidatePath(`/${user.username}`);
}

export interface UpdateClientIdentityInput {
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

export type UpdateClientIdentityResult = { ok: true; username: string } | { ok: false; error: string };

// Cambia nombre/apellido/username del cliente en Clerk, confirmando la
// identidad con la contraseña actual antes de aplicar el cambio.
export async function updateClientIdentity(
  input: UpdateClientIdentityInput,
): Promise<UpdateClientIdentityResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const username = input.username.trim().toLowerCase();

  if (!firstName) return { ok: false, error: "El nombre es obligatorio" };
  if (!username) return { ok: false, error: "El nombre de usuario es obligatorio" };
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "El nombre de usuario debe tener 3-30 caracteres: minúsculas, números, guiones o guion bajo.",
    };
  }

  const client = await clerkClient();

  try {
    const result = await client.users.verifyPassword({ userId, password: input.password });
    if (!result || (result as { verified?: boolean }).verified === false) {
      return { ok: false, error: "Contraseña incorrecta" };
    }
  } catch (error: unknown) {
    const clerkError = error as { errors?: Array<{ code?: string }> };
    const isMissingPassword = clerkError.errors?.some(
      (e) => e.code === "no_password_on_account" || e.code === "form_password_not_allowed",
    );
    if (isMissingPassword) {
      return {
        ok: false,
        error:
          "Tu cuenta usa inicio de sesión con Google/Facebook y no tiene contraseña; administra tu nombre desde el panel de seguridad.",
      };
    }
    return { ok: false, error: "Contraseña incorrecta" };
  }

  const previousUser = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  try {
    await client.users.updateUser(userId, { username, firstName, lastName });
  } catch (error: unknown) {
    const clerkError = error as { errors?: Array<{ code?: string; meta?: { paramName?: string } }> };
    const isDuplicateUsername = clerkError.errors?.some(
      (e) =>
        e.code === "form_identifier_exists" ||
        (e.code === "form_param_exists" && e.meta?.paramName === "username"),
    );
    if (isDuplicateUsername) {
      return { ok: false, error: "Ese nombre de usuario ya está en uso. Por favor elige otro." };
    }
    console.error("updateClientIdentity:", error);
    return { ok: false, error: "No se pudieron guardar los cambios. Intenta de nuevo." };
  }

  const name = `${firstName} ${lastName}`.trim();
  await prisma.user.update({ where: { id: userId }, data: { username, name } });

  if (previousUser?.username) revalidatePath(`/${previousUser.username}`);
  revalidatePath(`/${username}`);

  return { ok: true, username };
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

// Opt-in del Partner para exponer su WhatsApp en su perfil. Aun activado,
// solo lo ven usuarios logueados de la plataforma, nunca visitantes anónimos
// (el filtro por sesión vive en src/app/[username]/page.tsx).
export async function updatePartnerContactSharing(shareWhatsapp: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");
  const partner = await requirePartner(userId);

  await prisma.user.update({ where: { id: userId }, data: { shareWhatsapp } });
  if (partner.username) revalidatePath(`/${partner.username}`);
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
