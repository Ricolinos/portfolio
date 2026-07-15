"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { PORTFOLIO_MEDIA_BUCKET, supabaseAdmin } from "@/lib/supabaseAdmin";

// Mismo tope que MAX_VIDEO_FILE_BYTES (lib/videoUpload.ts): la spec de UX
// del editor es "menos de 10MB" para cualquier archivo subido (imagen, GIF
// o video). Coherente con el límite de la UI, no con el límite del bucket
// (15MB, ver scripts/setup-storage.ts) que solo pone un techo duro en
// Supabase.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Mapa MIME → extensión: whitelist explícita (coincide 1:1 con
// allowed_mime_types del bucket, ver scripts/setup-storage.ts). Cualquier
// tipo fuera de este mapa se rechaza.
const ALLOWED_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_MIME_EXT));

// Algunos navegadores/SO no completan `file.type` en ciertos flujos
// (drag-and-drop en Safari, mismo gotcha documentado en lib/videoUpload.ts,
// isMp4File): si el content-type declarado no está en el mapa, cae a la
// extensión del nombre de archivo como fallback antes de rechazar.
function resolveExtension(fileName: string, contentType: string): string | null {
  const byMime = ALLOWED_MIME_EXT[contentType];
  if (byMime) return byMime;
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return ext;
  return null;
}

export interface SignedUploadRequest {
  fileName: string;
  contentType: string;
  // Tamaño DECLARADO por el navegador (File.size) — es una validación de UX
  // temprana, no una garantía: el bucket de Storage también valida
  // file_size_limit del lado del servidor de Supabase (ver
  // scripts/setup-storage.ts) como defensa real.
  size: number;
}

export interface SignedUploadResult {
  signedUrl: string;
  token: string;
  path: string;
  publicUrl: string;
}

// Firma una subida directa navegador→Supabase Storage (el archivo NUNCA
// pasa por el body de esta server action / Vercel — ver
// lib/storageUpload.ts, que consume esto desde el cliente). Exige usuario
// Clerk logueado y valida extensión/MIME/tamaño ANTES de firmar; el path
// resultante (`<clerkUserId>/<uuid>.<ext>`) es la única fuente de verdad de
// quién subió cada archivo (autorización = Clerk, no Supabase Auth: los
// usuarios de la plataforma no tienen JWT de Supabase).
export async function createSignedUpload({
  fileName,
  contentType,
  size,
}: SignedUploadRequest): Promise<SignedUploadResult> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const ext = resolveExtension(fileName, contentType);
  if (!ext) {
    throw new Error(`Tipo de archivo no permitido: "${contentType || fileName}".`);
  }
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error("Tamaño de archivo inválido.");
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Este archivo pesa ${(size / (1024 * 1024)).toFixed(1)} MB. El máximo permitido es 10MB.`,
    );
  }

  const path = `${userId}/${randomUUID()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo firmar la subida.");
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .getPublicUrl(data.path);

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
}
