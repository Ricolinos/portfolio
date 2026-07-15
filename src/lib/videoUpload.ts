// Reglas de validación para subir un video CORTO como archivo (portada por
// video, bloque "video" del cuerpo, y slides de video del bloque "Carousel"
// — ver CreateProjectModal.tsx, ContentBlocks.tsx, VideoFileDropzone.tsx).
// Sin bucket de Storage, el archivo viaja como data URL dentro del body de
// la server action (igual que imágenes/GIF, ver lib/files.ts): por eso el
// límite de tamaño es deliberadamente chico y el formato se restringe a UN
// solo contenedor (.mp4) — el más compatible con <video>/data URL sin
// necesitar transcodificación.
//
// MATEMÁTICA DEL LÍMITE (ver next.config.mjs, bodySizeLimit): un archivo
// binario codificado en base64 (data URL) pesa ~4/3 (~33%) más que el
// original. 10MB de mp4 → ~13.4MB de data URL — de ahí que
// experimental.serverActions.bodySizeLimit suba a "15mb" (10 + margen).
//
// AVISO DE PRODUCCIÓN (no bloqueante aquí, documentar en el reporte de la
// tarea): Vercel capa el body de las funciones serverless (server actions)
// a ~4.5MB en producción — un video de más de ~3MB fallará al publicar en
// Vercel aunque pase esta validación local. Este límite de 10MB es la spec
// de UX pedida por el usuario para el editor (local/futuro con Storage
// real), no una garantía de que la subida funcione hoy en producción.
export const MAX_VIDEO_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const VIDEO_UPLOAD_HELP_TEXT = "Solo .mp4, menos de 10MB.";

function isMp4File(file: File): boolean {
  // Algunos navegadores/SO no completan `file.type` en ciertos flujos
  // (drag-and-drop en Safari, por ejemplo) — la extensión es el fallback
  // para ese caso. Un MIME type explícito y DISTINTO de mp4 (ej.
  // "video/quicktime" de un .mov) siempre rechaza, aunque el nombre del
  // archivo termine en ".mp4" por error del usuario.
  if (file.type && file.type !== "video/mp4") return false;
  return file.type === "video/mp4" || /\.mp4$/i.test(file.name);
}

// `null` = válido; cualquier string es el mensaje de error a mostrar.
export function validateVideoFile(file: File): string | null {
  if (!isMp4File(file)) {
    return "Solo se aceptan archivos de video .mp4.";
  }
  if (file.size > MAX_VIDEO_FILE_BYTES) {
    return `Este video pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. El máximo permitido es 10MB.`;
  }
  return null;
}
