// Portada de PortfolioPiece: imagen, GIF animado o video, TODO en el mismo
// campo `coverUrl` (String?) sin migración nueva — ver prisma/schema.prisma.
// Tres formas conviven en el mismo string:
// - Imagen:  data URL recomprimida por MediaUpload (compress=true), p.ej.
//            "data:image/webp;base64,..."
// - GIF:     data URL SIN recomprimir (compress=false en MediaUpload, ver
//            CreateProjectModal), siempre "data:image/gif;...": Compressor.js
//            usa canvas.toBlob, que solo captura el frame actual y mata la
//            animación — por eso el GIF nunca pasa por compresión.
// - Video:   dos formas posibles, distinguibles por prefijo/esquema:
//            (a) archivo .mp4 SUBIDO (protagonista, ver VideoFileDropzone +
//            lib/videoUpload.ts): data URL directa, siempre
//            "data:video/mp4;base64,...", SIN el prefijo de abajo — el
//            esquema "data:video/" ya es autodescriptivo.
//            (b) URL EXTERNA directa a un archivo .mp4/.webm/etc. servido
//            fuera de esta plataforma (opción secundaria, YouTube ya NO se
//            admite en portada — ver decisión de la tarea "portada de video
//            por archivo"), envuelta con el prefijo VIDEO_PREFIX. El
//            prefijo es NECESARIO ahí: sin él, en las tarjetas de listado
//            (Explorar/Home/perfil) no hay forma de distinguir "portada de
//            video" de "portada de imagen apuntando a una URL http" sin
//            tocar la red — permite decidir el tipo de forma síncrona y
//            barata en el server/cliente.
const VIDEO_PREFIX = "video:";

export type CoverKind = "image" | "gif" | "video";

// Archivo de video directo: mismo regex que dist/components/Media.js
// (isVideoUrl) — únicas extensiones que Media sabe reproducir con <video>.
// NO incluye YouTube: la portada por URL externa ya no admite YouTube (solo
// el bloque "video" del cuerpo del artículo lo sigue soportando, ver
// ContentBlocks.tsx).
const VIDEO_FILE_REGEX = /\.(mp4|webm|mov|avi|ogv|m4v|mkv|flv|wmv|3gp|3g2)(\?.*)?$/i;

// Antes de guardar una URL EXTERNA de video hay que confirmar que Media
// (once-ui) sabrá reproducirla: cualquier otra URL cae en next/image, y un
// hostname fuera de `images.remotePatterns` (next.config.mjs) tira el
// render entero. No aplica a archivos subidos (data:video/...): esos se
// detectan con `isVideoDataUrl`, no con este regex de extensión.
export function isPlayableVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return VIDEO_FILE_REGEX.test(trimmed);
}

// `Media` (once-ui) decide si algo es video con un regex de EXTENSIÓN de
// archivo (`\.(mp4|webm|...)$`, ver dist/components/Media.js) — un data URL
// de video ("data:video/mp4;base64,AAAA...") nunca termina en ".mp4", así
// que Media NUNCA lo reconoce como video (cae al <Image> de next/image, que
// truena con ese src). Todo lugar que renderice un video subido como
// archivo debe chequear esto ANTES y usar un <video> nativo en vez de
// <Media>/<Image>.
export function isVideoDataUrl(value: string | null | undefined): boolean {
  return !!value && value.startsWith("data:video/");
}

export function toVideoCoverUrl(url: string): string {
  return `${VIDEO_PREFIX}${url.trim()}`;
}

export function coverKindOf(coverUrl: string | null | undefined): CoverKind | null {
  if (!coverUrl) return null;
  if (coverUrl.startsWith(VIDEO_PREFIX) || isVideoDataUrl(coverUrl)) return "video";
  if (coverUrl.startsWith("data:image/gif")) return "gif";
  return "image";
}

// Quita el prefijo "video:" (si aplica) para obtener la URL real que
// entiende <Media src=...> / <video> / el embed de YouTube. Para imagen/GIF
// devuelve el valor tal cual (ya es la data URL o URL utilizable).
export function resolveCoverSrc(coverUrl: string | null | undefined): string {
  if (!coverUrl) return "";
  return coverUrl.startsWith(VIDEO_PREFIX) ? coverUrl.slice(VIDEO_PREFIX.length) : coverUrl;
}
