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

// GOTCHA (tarea "cards con portada de video rotas"): CreateProjectModal ya
// NO permite guardar una portada de YouTube (ver el comentario extenso junto
// a `VIDEO_FILE_REGEX` arriba, decisión de la tarea "portada de video por
// archivo") — pero el campo `coverUrl` es texto libre en BD, así que una
// pieza de ANTES de esa decisión (o escrita a mano/por script) puede seguir
// trayendo un link de YouTube crudo, SIN el prefijo `video:`. Sin este
// detector, `coverKindOf` clasificaba esa URL como "image" por default y las
// tarjetas de listado (Home/Explorar/perfil) intentaban un `<Media
// src="https://www.youtube.com/watch?v=...">` — next/image truena porque
// youtube.com no está en `images.remotePatterns` (next.config.mjs), y el
// render de la tarjeta se rompe. Cubre las 4 formas de URL de YouTube que
// también reconoce el bloque "video" del cuerpo (ver ContentBlocks.tsx):
// watch?v=, youtu.be/, /shorts/, /embed/.
const YOUTUBE_ID_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i;

export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(YOUTUBE_ID_REGEX);
  return match ? match[1] : null;
}

// Miniatura estática oficial de YouTube (sin API key, sin tocar la red desde
// el server): mismo endpoint que ya usa CarouselVideoSlide para el slide de
// video del cuerpo del artículo (ver mdx-carousel.tsx).
export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

// Embed no interactivo para autoplay en loop de la portada de YouTube (ver
// componente compartido VideoCover.tsx): controls=0 + modestbranding quitan
// la UI del player, loop=1 requiere repetir el id en `playlist` (gotcha
// documentado de la API de YouTube: sin `playlist` el parámetro `loop` no
// hace nada en un solo video), mute=1 es obligatorio junto con autoplay=1
// para que el navegador permita la reproducción automática.
export function youtubeEmbedLoopUrl(youtubeId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: youtubeId,
    controls: "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
  });
  return `https://www.youtube.com/embed/${youtubeId}?${params.toString()}`;
}

export function coverKindOf(coverUrl: string | null | undefined): CoverKind | null {
  if (!coverUrl) return null;
  if (coverUrl.startsWith(VIDEO_PREFIX) || isVideoDataUrl(coverUrl)) return "video";
  if (extractYouTubeId(coverUrl)) return "video";
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
