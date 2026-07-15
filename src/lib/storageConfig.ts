// Nombre del bucket de Supabase Storage para la media del editor de
// proyectos (portada + bloques del Canvas, ver lib/storageUpload.ts y
// app/actions/media.ts). Vive en su propio módulo SIN guard "server-only"
// (a diferencia de lib/supabaseAdmin.ts) porque lo consume tanto código
// server (la server action que firma la subida) como código client (el
// helper que sube el archivo directo al bucket) — es solo un string, no
// expone ningún secreto.
export const PORTFOLIO_MEDIA_BUCKET = "portfolio-media";

// Distingue "URL subida por el usuario vía lib/storageUpload.ts" de "URL
// externa pegada a mano" (ej. portada por video, ver CreateProjectModal):
// ambas son https reales e indistinguibles por extensión, así que se
// compara contra el prefijo público real del bucket en esta instancia de
// Supabase (dev/prod comparten la misma). No aplica a data URLs legacy
// ("data:video/..."), que se detectan aparte (ver isVideoDataUrl en
// lib/coverMedia.ts).
export function isPortfolioMediaUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !url) return false;
  return url.startsWith(`${base}/storage/v1/object/public/${PORTFOLIO_MEDIA_BUCKET}/`);
}
