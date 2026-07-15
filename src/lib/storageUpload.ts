"use client";

import { createSignedUpload } from "@/app/actions/media";
import { PORTFOLIO_MEDIA_BUCKET } from "@/lib/storageConfig";
import { createClient } from "@/utils/supabase/client";

// Sube un archivo DIRECTO del navegador a Supabase Storage: pide la firma a
// `createSignedUpload` (server action, valida usuario Clerk + tipo/tamaño)
// y sube los bytes con esa firma vía `uploadToSignedUrl`, usando la
// publishable key (sin permisos de escritura propios — la firma es lo que
// autoriza esta subida puntual). El archivo NUNCA viaja por el body de una
// server action / Vercel, que es el problema que esto reemplaza (antes:
// data URL en el payload, ver lib/files.ts readFileAsDataUrl).
//
// Reemplaza a `readFileAsDataUrl` en todo punto de subida NUEVO del editor
// (portada, bloques del Canvas, video) — las piezas YA guardadas con data
// URLs siguen intactas y renderizando igual (ambos formatos son válidos en
// los mismos campos, ver PortfolioPiece.coverUrl/contentBlocks).
export async function uploadMediaFile(file: File): Promise<string> {
  const { token, path, publicUrl } = await createSignedUpload({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(PORTFOLIO_MEDIA_BUCKET)
    .uploadToSignedUrl(path, token, file);

  if (error) throw new Error(error.message || "No se pudo subir el archivo.");

  return publicUrl;
}
