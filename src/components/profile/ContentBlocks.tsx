"use client";

import {
  Avatar,
  AvatarGroup,
  Badge,
  Carousel,
  Column,
  EmojiPickerDropdown,
  Feedback,
  Icon,
  IconButton,
  Input,
  Line,
  LogoCloud,
  MasonryGrid,
  Media,
  ProgressBar,
  Row,
  Scroller,
  Select,
  Spinner,
  StatusIndicator,
  Switch,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { type PublicPartnerResult, searchPublicPartners } from "@/app/actions/portfolioPieces";
import { readFileAsDataUrl } from "@/lib/files";

// El Canvas no edita un .md crudo: el usuario arma bloques estructurados y
// estos se serializan a Markdown/MDX (texto plano) tras bambalinas al
// guardar. El visualizador de proyectos (src/components/mdx.tsx) resuelve
// ese texto con el mismo sistema de componentes Once UI, así que los
// bloques que generan JSX (ej. Carousel) deben tener su contraparte
// registrada ahí.
// Tokens tal cual los expone Once UI (ver ai/components/*.json del harness):
// no son libres, así que se restringen aquí a los valores reales de cada prop.
export type TagVariant =
  | "neutral"
  | "brand"
  | "accent"
  | "info"
  | "danger"
  | "warning"
  | "success"
  | "gradient";
export type TagSize = "s" | "m" | "l";
export type StatusColor =
  | "blue"
  | "indigo"
  | "violet"
  | "magenta"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "moss"
  | "green"
  | "emerald"
  | "aqua"
  | "cyan"
  | "gray";

export type ContentBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "carousel"; images: { id: string; url: string; alt: string }[] }
  | { id: string; type: "embed"; language: string; code: string }
  | { id: string; type: "link"; url: string; label: string }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "divider" }
  | { id: string; type: "tag"; label: string; variant: TagVariant; size: TagSize }
  | { id: string; type: "badge"; title: string; href: string }
  | { id: string; type: "status"; color: StatusColor; text: string }
  | { id: string; type: "progress"; value: number; min: number; max: number; showLabel: boolean }
  | {
      id: string;
      type: "avatarGroup";
      // `username`/`name` son opcionales y retrocompatibles: los bloques
      // guardados antes de la herramienta "Colaboradores" (edición manual de
      // URL/iniciales) no los tienen y siguen renderizando igual (sin link).
      avatars: {
        id: string;
        url: string;
        initials: string;
        username?: string;
        name?: string;
      }[];
    }
  | { id: string; type: "logoCloud"; logos: { id: string; url: string }[]; columns: number }
  | { id: string; type: "scroller"; items: { id: string; text: string }[] }
  | {
      id: string;
      type: "masonry";
      images: { id: string; url: string; alt: string }[];
      columns: number;
    };

export type ContentBlockType = ContentBlock["type"];

export const BLOCK_TYPES: { type: ContentBlockType; label: string; icon: string }[] = [
  { type: "image", label: "Imagen", icon: "images" },
  { type: "text", label: "Texto", icon: "document" },
  { type: "carousel", label: "Carousel de fotos", icon: "carousel" },
  { type: "embed", label: "Incrustar", icon: "codeBracket" },
  { type: "link", label: "Links", icon: "openLink" },
  { type: "video", label: "Video", icon: "film" },
  { type: "divider", label: "Divisor", icon: "divider" },
  { type: "tag", label: "Etiqueta", icon: "shapes" },
  { type: "badge", label: "Insignia", icon: "sparkles" },
  { type: "status", label: "Estado", icon: "infoCircle" },
  { type: "progress", label: "Barra de progreso", icon: "refreshCw" },
  { type: "avatarGroup", label: "Colaboradores", icon: "userGroup" },
  { type: "logoCloud", label: "Nube de logos", icon: "grid" },
  { type: "scroller", label: "Tira deslizable", icon: "arrowRight" },
  { type: "masonry", label: "Cuadrícula de fotos", icon: "gallery" },
];

const BLOCK_LABEL: Record<ContentBlockType, string> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.type, b.label]),
) as Record<ContentBlockType, string>;

const BLOCK_ICON: Record<ContentBlockType, string> = Object.fromEntries(
  BLOCK_TYPES.map((b) => [b.type, b.icon]),
) as Record<ContentBlockType, string>;

function newId(): string {
  return crypto.randomUUID();
}

// LogoCloud extiende Grid: su prop `columns` es GridSize (1–12), no un
// `number` genérico como el resto de los bloques. Se acota aquí para la
// vista previa en vivo del editor.
function toGridSize(columns: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 {
  const clamped = Math.min(12, Math.max(1, Math.round(columns) || 1));
  return clamped as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

export function createBlock(type: ContentBlockType): ContentBlock {
  switch (type) {
    case "text":
      return { id: newId(), type, html: "" };
    case "image":
      return { id: newId(), type, url: "", alt: "" };
    case "carousel":
      return { id: newId(), type, images: [] };
    case "embed":
      return { id: newId(), type, language: "", code: "" };
    case "link":
      return { id: newId(), type, url: "", label: "" };
    case "video":
      return { id: newId(), type, url: "" };
    case "divider":
      return { id: newId(), type };
    case "tag":
      return { id: newId(), type, label: "", variant: "neutral", size: "m" };
    case "badge":
      return { id: newId(), type, title: "", href: "" };
    case "status":
      return { id: newId(), type, color: "green", text: "" };
    case "progress":
      return { id: newId(), type, value: 50, min: 0, max: 100, showLabel: true };
    case "avatarGroup":
      return { id: newId(), type, avatars: [] };
    case "logoCloud":
      return { id: newId(), type, logos: [], columns: 4 };
    case "scroller":
      return { id: newId(), type, items: [] };
    case "masonry":
      return { id: newId(), type, images: [], columns: 3 };
  }
}

// Soporta watch?v=, youtu.be/, /embed/ y /shorts/.
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}

// GOTCHA CRÍTICO (descubierto al integrar los 8 bloques nuevos, aplica
// retroactivamente a carousel/video/compare): next-mdx-remote/rsc compila
// con blockJS=true por defecto (serialize.js → removeJavaScriptExpressions),
// que elimina TODO atributo JSX escrito con llaves `prop={...}` —number,
// boolean, array u objeto— y solo deja pasar strings entre comillas planas
// o el shorthand booleano `prop` (sin valor). Verificado en pantalla:
// `<ProgressBar value={70} .../>` llega al componente con props={} (el
// atributo entero desaparece, no solo su valor), y `items={[...]}` en
// Carousel dejaba el prop `items` undefined sin tronar (silencioso). Por
// eso todos los bloques de abajo escriben SIEMPRE atributos planos con
// comillas ("value=\"70\"") en vez de `{70}`, y usan el shorthand
// booleano en vez de `{true}`/`{false}`.
const escapeAttr = (value: string) => value.replace(/"/g, "%22");

function blockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case "text":
      return block.html.trim()
        ? `<Text variant="body-default-m" onBackground="neutral-medium">\n${block.html.trim()}\n</Text>`
        : "";
    case "image":
      return block.url ? `![${block.alt}](${block.url})` : "";
    case "carousel": {
      const images = block.images.filter((i) => i.url);
      if (images.length === 0) return "";
      // Carousel real requiere `items` como array-prop: mismo bloqueo
      // estructural que AvatarGroup.avatars/LogoCloud.logos (ver GOTCHA
      // arriba) — imposible de pasar por este pipeline. Se sustituye por
      // Scroller (componente real, props planas) con Media individuales:
      // una tira horizontal deslizable, con las mismas flechas de
      // navegación que trae Scroller de fábrica.
      const items = images
        .map(
          (i) =>
            `  <Media src="${escapeAttr(i.url)}" alt="${escapeAttr(i.alt)}" aspectRatio="4 / 3" radius="m" width="160" minWidth="160" />`,
        )
        .join("\n");
      return `<Scroller direction="row" fadeColor="page" gap="12">\n${items}\n</Scroller>`;
    }
    case "embed":
      return block.code.trim() ? `\`\`\`${block.language}\n${block.code}\n\`\`\`` : "";
    case "link": {
      if (!block.url) return "";
      // Antes emitía markdown plano (`[label](url)`), que remark envuelve en
      // un `<p>` indistinguible del texto normal — no hay forma de centrar
      // SOLO ese `<p>` sin también centrar párrafos de texto real. Usar
      // `SmartLink` (ya registrado en el mapa de components de MDX) dentro
      // de un `Row` explícito lo vuelve un bloque propio, centrable igual
      // que logoCloud/avatarGroup/status (ver createRowElement en mdx.tsx).
      const label = block.label.trim() || block.url;
      return `<Row fillWidth horizontal="center">\n  <SmartLink href="${escapeAttr(block.url)}">${label}</SmartLink>\n</Row>`;
    }
    case "video": {
      const youtubeId = extractYouTubeId(block.url);
      if (!youtubeId) return "";
      const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
      // `src={JSON.stringify(embedUrl)}` y `style={{ aspectRatio, border }}`
      // se eliminaban por el GOTCHA de arriba (llaves) — y aunque no fuera
      // así, <iframe> es un elemento nativo (sin override en mdx.tsx) y
      // React exige que `style` sea objeto, no string, así que un
      // `style="..."` plano tampoco serviría. El aspect ratio se resuelve
      // con el prop nativo `aspectRatio` (string) de Column, igual que en
      // `compare`/`carousel`, en vez de un `style` de CSS.
      return `<Column fillWidth radius="m" overflow="hidden" aspectRatio="16 / 9">\n  <iframe width="100%" height="100%" src="${embedUrl}" title="Video de YouTube" frameBorder="0" allowFullScreen></iframe>\n</Column>`;
    }
    case "divider":
      return "---";
    case "tag":
      // Envuelto en su propio `Row fillWidth horizontal="center"` (igual
      // que logoCloud/avatarGroup/status/link): `Tag` es `fitWidth` en
      // Once UI (Tag.js), así que sin este envoltorio queda pegado a la
      // izquierda del artículo. No se centra desde el mapa de components de
      // MDX porque `Tag` también es el chip que arma `scroller` (ver
      // createRowElement en mdx.tsx para el detalle).
      return block.label.trim()
        ? `<Row fillWidth horizontal="center">\n  <Tag variant="${block.variant}" size="${block.size}" label="${escapeAttr(block.label.trim())}" />\n</Row>`
        : "";
    case "badge": {
      if (!block.title.trim()) return "";
      const href = block.href.trim();
      // Mismo criterio que "tag" (ver comentario ahí): `Badge` es `fitWidth`
      // en Once UI (Badge.js).
      return `<Row fillWidth horizontal="center">\n  <Badge title="${escapeAttr(block.title.trim())}"${
        href ? ` href="${escapeAttr(href)}"` : ""
      } />\n</Row>`;
    }
    case "status": {
      if (!block.text.trim()) return "";
      return [
        `<Row gap="8" vertical="center">`,
        `  <StatusIndicator color="${block.color}" />`,
        `  <Text variant="body-default-m" onBackground="neutral-medium">${block.text.trim()}</Text>`,
        `</Row>`,
      ].join("\n");
    }
    case "progress": {
      // `label` es boolean: {true}/{false} se eliminan igual que cualquier
      // otro atributo con llaves, así que se usa el shorthand JSX (mismo
      // efecto que label={true}) o un string vacío (falsy) para false.
      const labelAttr = block.showLabel ? " label" : ` label=""`;
      return `<ProgressBar value="${block.value}" min="${block.min}" max="${block.max}"${labelAttr} />`;
    }
    case "avatarGroup": {
      const avatars = block.avatars.filter((a) => a.url || a.initials.trim());
      if (avatars.length === 0) return "";
      // AvatarGroup real requiere `avatars` como array-prop: imposible de
      // pasar por este pipeline (ver GOTCHA arriba) — verificado en
      // pantalla que el prop llega undefined y truena en "avatars.map".
      // Se sustituye por Avatar individuales (mismo componente real de
      // Once UI, props planas) dentro de una Row. Los colaboradores
      // agregados vía búsqueda (con `username`) se envuelven en `SmartLink`
      // (ya registrado en el mapa de components de MDX, mismo patrón que el
      // bloque "link") para enlazar a su perfil `/${username}`; los
      // avatares viejos sin `username` quedan igual que antes, sin link.
      const items = avatars
        .map((a) => {
          const avatarTag = a.url
            ? `<Avatar src="${escapeAttr(a.url)}" size="m" />`
            : `<Avatar value="${escapeAttr(a.initials.trim())}" size="m" />`;
          if (a.username) {
            return `  <SmartLink href="/${escapeAttr(a.username)}">${avatarTag}</SmartLink>`;
          }
          return `  ${avatarTag}`;
        })
        .join("\n");
      return `<Row gap="8">\n${items}\n</Row>`;
    }
    case "logoCloud": {
      const logos = block.logos.filter((l) => l.url);
      if (logos.length === 0) return "";
      // Mismo bloqueo que AvatarGroup: `logos` es un array-prop imposible
      // de pasar por este pipeline. Se sustituye por una fila de Media
      // (mismo tamaño de tile) — visualmente equivalente a una nube de
      // logos, aunque no sea el componente LogoCloud en sí.
      const items = logos
        .map(
          (l) =>
            `  <Media src="${escapeAttr(l.url)}" alt="Logo" width="6" height="4" radius="m" />`,
        )
        .join("\n");
      // `fitWidth` es clave: sin él, el Row hereda el ancho completo del
      // Column padre (align-items: stretch por default) y, al quedar más
      // ancho que sus tiles, deja un hueco final del tamaño aproximado de
      // un tile más — verificado en pantalla, se percibe como un "5º
      // espacio" vacío aunque el DOM solo tenga 4 <Media>. `fitWidth` hace
      // que el Row se encoja a su contenido real (4 tiles + gaps), sin
      // importar cuántos logos haya.
      return `<Row gap="24" wrap fitWidth>\n${items}\n</Row>`;
    }
    case "scroller": {
      const items = block.items.filter((i) => i.text.trim());
      if (items.length === 0) return "";
      const tags = items
        .map((i) => `  <Tag variant="neutral" label="${escapeAttr(i.text.trim())}" />`)
        .join("\n");
      return `<Scroller direction="row" fadeColor="page">\n${tags}\n</Scroller>`;
    }
    case "masonry": {
      const images = block.images.filter((i) => i.url);
      if (images.length === 0) return "";
      const items = images
        .map((i) => `  <Media src="${escapeAttr(i.url)}" alt="${escapeAttr(i.alt)}" radius="m" />`)
        .join("\n");
      return `<MasonryGrid columns="${block.columns}">\n${items}\n</MasonryGrid>`;
    }
  }
}

export function blocksToMarkdown(blocks: ContentBlock[]): string {
  return blocks
    .map(blockToMarkdown)
    .filter((text) => text.trim() !== "")
    .join("\n\n");
}

// --- Editor de texto enriquecido -------------------------------------------
// contentEditable + una barra con las operaciones más comunes. El resultado
// se guarda como HTML crudo: el visualizador lo embebe tal cual dentro de un
// <Text> (MDX soporta HTML embebido sin registrar cada tag).
const FONT_OPTIONS = [
  { label: "Predeterminada", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monoespaciada", value: "var(--font-code, monospace)" },
];

const SIZE_OPTIONS = [
  { label: "Normal", value: "" },
  { label: "Pequeño", value: "0.875rem" },
  { label: "Grande", value: "1.25rem" },
  { label: "Título", value: "1.75rem" },
];

// --- Opciones de los bloques nuevos -----------------------------------------
const TAG_VARIANT_OPTIONS: { label: string; value: TagVariant }[] = [
  { label: "Neutro", value: "neutral" },
  { label: "Marca", value: "brand" },
  { label: "Acento", value: "accent" },
  { label: "Info", value: "info" },
  { label: "Peligro", value: "danger" },
  { label: "Advertencia", value: "warning" },
  { label: "Éxito", value: "success" },
  { label: "Degradado", value: "gradient" },
];

const TAG_SIZE_OPTIONS: { label: string; value: TagSize }[] = [
  { label: "Pequeño", value: "s" },
  { label: "Mediano", value: "m" },
  { label: "Grande", value: "l" },
];

const STATUS_COLOR_OPTIONS: { label: string; value: StatusColor }[] = [
  { label: "Azul", value: "blue" },
  { label: "Índigo", value: "indigo" },
  { label: "Violeta", value: "violet" },
  { label: "Magenta", value: "magenta" },
  { label: "Rosa", value: "pink" },
  { label: "Rojo", value: "red" },
  { label: "Naranja", value: "orange" },
  { label: "Amarillo", value: "yellow" },
  { label: "Musgo", value: "moss" },
  { label: "Verde", value: "green" },
  { label: "Esmeralda", value: "emerald" },
  { label: "Aqua", value: "aqua" },
  { label: "Cian", value: "cyan" },
  { label: "Gris", value: "gray" },
];

// --- Herramienta "Colaboradores" (bloque avatarGroup) -----------------------
const MAX_COLLABORATORS = 8;

// Iniciales para el fallback de `Avatar` cuando el partner no tiene foto de
// perfil: primeras letras de las 2 primeras palabras del nombre (o del
// username si no hay nombre).
function computeInitials(name: string | null, username: string): string {
  const source = (name || username).trim();
  if (!source) return "";
  const letters = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return letters || source[0]?.toUpperCase() || "";
}

function partnerToAvatar(partner: PublicPartnerResult): {
  id: string;
  url: string;
  initials: string;
  username?: string;
  name?: string;
} {
  return {
    id: partner.id,
    url: partner.imageUrl ?? "",
    initials: computeInitials(partner.name, partner.username),
    username: partner.username,
    name: partner.name ?? undefined,
  };
}

interface CollaboratorSearchProps {
  disabled?: boolean;
  excludeIds: string[];
  onAdd: (partner: PublicPartnerResult) => void;
}

// Buscador de perfiles reales (server action `searchPublicPartners`) con
// debounce, usado por el editor del bloque "Colaboradores" en vez de la
// antigua subida manual de foto/iniciales.
function CollaboratorSearch({ disabled, excludeIds, onAdd }: CollaboratorSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicPartnerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      searchPublicPartners(query, 8)
        .then((partners) => setResults(partners))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  const visibleResults = results.filter((partner) => !excludeIds.includes(partner.id));

  return (
    <Column fillWidth gap="8" style={{ position: "relative" }}>
      <Input
        id="collaborator-search"
        placeholder="Buscar por nombre o usuario…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Retraso corto: deja que el onMouseDown de la opción (que ya hizo
          // preventDefault) dispare su onClick antes de cerrar el popover.
          setTimeout(() => setOpen(false), 150);
        }}
        disabled={disabled}
      />
      {open && (loading || visibleResults.length > 0) && (
        <Column
          fillWidth
          gap="2"
          radius="m"
          border="neutral-alpha-weak"
          padding="4"
          background="page"
          shadow="l"
          style={{ maxHeight: "14rem", overflowY: "auto" }}
        >
          {loading && (
            <Row fillWidth horizontal="center" padding="8">
              <Spinner size="s" ariaLabel="Buscando colaboradores" />
            </Row>
          )}
          {!loading &&
            visibleResults.map((partner) => (
              <Row
                key={partner.id}
                fillWidth
                gap="8"
                vertical="center"
                padding="8"
                radius="s"
                cursor="interactive"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onAdd(partner);
                  setQuery("");
                  setResults([]);
                }}
              >
                {partner.imageUrl ? (
                  <Avatar src={partner.imageUrl} size="s" />
                ) : (
                  <Avatar value={computeInitials(partner.name, partner.username)} size="s" />
                )}
                <Column gap="2">
                  <Text variant="label-default-s" onBackground="neutral-strong">
                    {partner.name || partner.username}
                  </Text>
                  {partner.headline && (
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {partner.headline}
                    </Text>
                  )}
                </Column>
              </Row>
            ))}
        </Column>
      )}
    </Column>
  );
}

// Envuelve la selección actual en `tag` (con atributos opcionales, ej. href).
// Si la selección cruza límites de nodos, surroundContents falla: el
// fallback extrae y reinserta el contenido, perdiendo el nodo original pero
// preservando el texto.
function wrapSelection(tag: string, attrs?: Record<string, string>): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) wrapper.setAttribute(key, value);
  }
  try {
    range.surroundContents(wrapper);
  } catch {
    const content = range.extractContents();
    wrapper.appendChild(content);
    range.insertNode(wrapper);
  }
  selection.removeAllRanges();
  const newRange = document.createRange();
  newRange.selectNodeContents(wrapper);
  selection.addRange(newRange);
}

function insertTextAtCursor(text: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

interface RichTextEditorProps {
  html: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

function RichTextEditor({ html, onChange, disabled }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(html);

  // Solo sincroniza el DOM cuando el cambio viene de afuera (ej. al cargar
  // un borrador): si lo hiciéramos en cada emit, el cursor saltaría al
  // inicio en cada tecla.
  useEffect(() => {
    if (ref.current && html !== lastEmitted.current) {
      ref.current.innerHTML = html;
      lastEmitted.current = html;
    }
  }, [html]);

  const emit = () => {
    if (!ref.current) return;
    lastEmitted.current = ref.current.innerHTML;
    onChange(lastEmitted.current);
  };

  const focusEditor = () => ref.current?.focus();

  const applyTag = (tag: string) => {
    focusEditor();
    wrapSelection(tag);
    emit();
  };

  const applyStyle = (style: string) => {
    if (!style) return;
    focusEditor();
    wrapSelection("span", { style });
    emit();
  };

  const insertLink = () => {
    const url = window.prompt("URL del enlace");
    if (!url) return;
    focusEditor();
    wrapSelection("a", { href: url, target: "_blank", rel: "noopener noreferrer" });
    emit();
  };

  const insertEmoji = (emoji: string) => {
    focusEditor();
    insertTextAtCursor(emoji);
    emit();
  };

  return (
    <Column fillWidth gap="8" radius="m" border="neutral-alpha-weak" padding="8" background="page">
      <Row gap="4" vertical="center" wrap style={{ overflowX: "auto" }}>
        <Select
          id="rich-text-font"
          options={FONT_OPTIONS}
          value=""
          onSelect={(value) => applyStyle(value)}
          disabled={disabled}
          style={{ width: "9rem" }}
        />
        <Select
          id="rich-text-size"
          options={SIZE_OPTIONS}
          value=""
          onSelect={(value) => applyStyle(value)}
          disabled={disabled}
          style={{ width: "7rem" }}
        />
        <Line vert background="neutral-alpha-weak" style={{ height: "1.25rem" }} />
        <IconButton
          icon="bold"
          tooltip="Negrita"
          variant="tertiary"
          size="s"
          onClick={() => applyTag("strong")}
          disabled={disabled}
        />
        <IconButton
          icon="italic"
          tooltip="Cursiva"
          variant="tertiary"
          size="s"
          onClick={() => applyTag("em")}
          disabled={disabled}
        />
        <IconButton
          icon="underline"
          tooltip="Subrayado"
          variant="tertiary"
          size="s"
          onClick={() => applyTag("u")}
          disabled={disabled}
        />
        <IconButton
          icon="strikethrough"
          tooltip="Tachado"
          variant="tertiary"
          size="s"
          onClick={() => applyTag("s")}
          disabled={disabled}
        />
        <Line vert background="neutral-alpha-weak" style={{ height: "1.25rem" }} />
        <IconButton
          icon="link"
          tooltip="Insertar enlace"
          variant="tertiary"
          size="s"
          onClick={insertLink}
          disabled={disabled}
        />
        <EmojiPickerDropdown
          onSelect={insertEmoji}
          trigger={
            <IconButton
              icon="emoji"
              tooltip="Insertar emoji"
              variant="tertiary"
              size="s"
              disabled={disabled}
            />
          }
        />
      </Row>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        tabIndex={0}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        style={{ minHeight: "6rem", outline: "none", lineHeight: 1.6 }}
      />
    </Column>
  );
}

interface ContentBlockCardProps {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  // Reordenamiento por arrastre (ver CreateProjectModal): el estado de "qué
  // bloque se arrastra" y el cómputo del índice de inserción viven en el
  // padre (dueño del array de bloques); esta tarjeta solo dispara el gesto
  // desde su handle dedicado, nunca desde el cuerpo completo — así no
  // compite con los inputs/textarea/contentEditable/MediaUpload internos.
  isDragging?: boolean;
  onDragHandleStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragHandleEnd: () => void;
}

export function ContentBlockCard({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disabled,
  isDragging,
  onDragHandleStart,
  onDragHandleEnd,
}: ContentBlockCardProps) {
  // Colapso puramente de UI: vive en este componente (keyed por block.id vía
  // el `key` que le pone el padre), nunca se escribe en `block` ni entra a
  // blocksToMarkdown/blockToMarkdown.
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="m"
      border="neutral-alpha-weak"
      background="page"
      opacity={isDragging ? 50 : 100}
    >
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="4" vertical="center">
          <IconButton
            icon={collapsed ? "chevronRight" : "chevronDown"}
            variant="tertiary"
            size="s"
            tooltip={collapsed ? "Expandir sección" : "Colapsar sección"}
            onClick={() => setCollapsed((current) => !current)}
            disabled={disabled}
          />
          <IconButton
            icon="dragHandle"
            variant="tertiary"
            size="s"
            tooltip="Arrastrar para reordenar"
            disabled={disabled}
            draggable={!disabled}
            onDragStart={onDragHandleStart}
            onDragEnd={onDragHandleEnd}
            style={{ cursor: disabled ? "not-allowed" : "grab" }}
          />
          <Icon name={BLOCK_ICON[block.type]} size="s" onBackground="neutral-weak" />
          <Text variant="label-strong-s" onBackground="neutral-weak">
            {BLOCK_LABEL[block.type]}
          </Text>
        </Row>
        <Row gap="4" vertical="center">
          <IconButton
            icon="chevronUp"
            variant="tertiary"
            size="s"
            tooltip="Mover arriba"
            onClick={onMoveUp}
            disabled={disabled || !canMoveUp}
          />
          <IconButton
            icon="chevronDown"
            variant="tertiary"
            size="s"
            tooltip="Mover abajo"
            onClick={onMoveDown}
            disabled={disabled || !canMoveDown}
          />
          <IconButton
            icon="trash"
            variant="tertiary"
            size="s"
            tooltip="Quitar sección"
            onClick={onRemove}
            disabled={disabled}
          />
        </Row>
      </Row>

      {!collapsed && block.type === "text" && (
        <RichTextEditor
          html={block.html}
          onChange={(next) => onChange({ ...block, html: next })}
          disabled={disabled}
        />
      )}

      {!collapsed && block.type === "image" && (
        <Column gap="8">
          <MediaUpload
            aspectRatio="16 / 9"
            accept="image/*"
            compress
            resizeMaxWidth={1600}
            resizeMaxHeight={1600}
            initialPreviewImage={block.url || null}
            emptyState="Subir imagen"
            onFileUpload={async (file) =>
              onChange({ ...block, url: await readFileAsDataUrl(file) })
            }
          />
          <Input
            id={`block-${block.id}-alt`}
            label="Texto alternativo"
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            disabled={disabled}
          />
        </Column>
      )}

      {!collapsed && block.type === "carousel" && (
        <Column gap="12">
          <Carousel
            indicator="thumbnail"
            aspectRatio="4 / 3"
            items={[
              ...block.images
                .filter((image) => image.url)
                .map((image) => ({ slide: image.url, alt: image.alt })),
              {
                alt: "Agregar imagen",
                slide: (
                  <MediaUpload
                    aspectRatio="4 / 3"
                    accept="image/*"
                    compress
                    resizeMaxWidth={1600}
                    resizeMaxHeight={1600}
                    emptyState="Agregar imagen"
                    onFileUpload={async (file) => {
                      const url = await readFileAsDataUrl(file);
                      onChange({
                        ...block,
                        images: [...block.images, { id: newId(), url, alt: "" }],
                      });
                    }}
                  />
                ),
              },
            ]}
          />
          {block.images.filter((image) => image.url).length > 0 && (
            <Column gap="8">
              {block.images.map((image, index) =>
                image.url ? (
                  <Row key={image.id} gap="8" vertical="center">
                    <Input
                      id={`block-${block.id}-${image.id}-alt`}
                      placeholder={`Alt de la imagen ${index + 1}`}
                      value={image.alt}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          images: block.images.map((i) =>
                            i.id === image.id ? { ...i, alt: e.target.value } : i,
                          ),
                        })
                      }
                      disabled={disabled}
                    />
                    <IconButton
                      icon="trash"
                      variant="tertiary"
                      size="s"
                      tooltip="Quitar imagen"
                      disabled={disabled}
                      onClick={() =>
                        onChange({
                          ...block,
                          images: block.images.filter((i) => i.id !== image.id),
                        })
                      }
                    />
                  </Row>
                ) : null,
              )}
            </Column>
          )}
        </Column>
      )}

      {!collapsed && block.type === "embed" && (
        <Column gap="8">
          <Input
            id={`block-${block.id}-language`}
            label="Lenguaje (opcional)"
            value={block.language}
            onChange={(e) => onChange({ ...block, language: e.target.value })}
            disabled={disabled}
          />
          <Textarea
            id={`block-${block.id}-code`}
            label="Código"
            variant="ghost"
            lines="auto"
            resize="none"
            style={{ fontFamily: "var(--font-code)" }}
            value={block.code}
            onChange={(e) => onChange({ ...block, code: e.target.value })}
            disabled={disabled}
          />
        </Column>
      )}

      {!collapsed && block.type === "link" && (
        <Column gap="8">
          <Input
            id={`block-${block.id}-label`}
            label="Texto del enlace"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            disabled={disabled}
          />
          <Input
            id={`block-${block.id}-url`}
            label="URL"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            disabled={disabled}
          />
        </Column>
      )}

      {!collapsed && block.type === "video" && (
        <Column gap="8">
          <Input
            id={`block-${block.id}-url`}
            label="Link de YouTube"
            placeholder="https://www.youtube.com/watch?v=…"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            disabled={disabled}
          />
          {(() => {
            const youtubeId = extractYouTubeId(block.url);
            if (youtubeId) {
              return (
                <Column fillWidth radius="m" overflow="hidden" style={{ aspectRatio: "16 / 9" }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${youtubeId}`}
                    title="Video de YouTube"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 0 }}
                  />
                </Column>
              );
            }
            if (block.url.trim() !== "") {
              return (
                <Feedback
                  variant="danger"
                  description="No se reconoce el link como un video de YouTube válido."
                />
              );
            }
            return null;
          })()}
        </Column>
      )}

      {!collapsed && block.type === "divider" && (
        <Row fillWidth vertical="center" gap="8">
          <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Línea divisoria
          </Text>
          <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
        </Row>
      )}

      {!collapsed && block.type === "tag" && (
        <Column gap="12">
          <Row gap="8" wrap>
            <Select
              id={`block-${block.id}-variant`}
              label="Variante"
              options={TAG_VARIANT_OPTIONS}
              value={block.variant}
              onSelect={(value) => onChange({ ...block, variant: value as TagVariant })}
              disabled={disabled}
              style={{ width: "10rem" }}
            />
            <Select
              id={`block-${block.id}-size`}
              label="Tamaño"
              options={TAG_SIZE_OPTIONS}
              value={block.size}
              onSelect={(value) => onChange({ ...block, size: value as TagSize })}
              disabled={disabled}
              style={{ width: "8rem" }}
            />
          </Row>
          <Input
            id={`block-${block.id}-label`}
            label="Texto"
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            disabled={disabled}
          />
          {block.label.trim() !== "" && (
            <Row>
              <Tag variant={block.variant} size={block.size} label={block.label} />
            </Row>
          )}
        </Column>
      )}

      {!collapsed && block.type === "badge" && (
        <Column gap="8">
          <Input
            id={`block-${block.id}-title`}
            label="Título"
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            disabled={disabled}
          />
          <Input
            id={`block-${block.id}-href`}
            label="Link (opcional)"
            value={block.href}
            onChange={(e) => onChange({ ...block, href: e.target.value })}
            disabled={disabled}
          />
          {block.title.trim() !== "" && (
            <Row>
              <Badge title={block.title} href={block.href.trim() || undefined} />
            </Row>
          )}
        </Column>
      )}

      {!collapsed && block.type === "status" && (
        <Column gap="8">
          <Select
            id={`block-${block.id}-color`}
            label="Color"
            options={STATUS_COLOR_OPTIONS}
            value={block.color}
            onSelect={(value) => onChange({ ...block, color: value as StatusColor })}
            disabled={disabled}
            style={{ width: "10rem" }}
          />
          <Input
            id={`block-${block.id}-text`}
            label="Texto"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            disabled={disabled}
          />
          {block.text.trim() !== "" && (
            <Row gap="8" vertical="center">
              <StatusIndicator color={block.color} />
              <Text variant="body-default-m" onBackground="neutral-medium">
                {block.text}
              </Text>
            </Row>
          )}
        </Column>
      )}

      {!collapsed && block.type === "progress" && (
        <Column gap="12">
          <Row gap="8" wrap>
            <Input
              id={`block-${block.id}-value`}
              label="Valor"
              type="number"
              value={String(block.value)}
              onChange={(e) => onChange({ ...block, value: Number(e.target.value) || 0 })}
              disabled={disabled}
            />
            <Input
              id={`block-${block.id}-min`}
              label="Mínimo"
              type="number"
              value={String(block.min)}
              onChange={(e) => onChange({ ...block, min: Number(e.target.value) || 0 })}
              disabled={disabled}
            />
            <Input
              id={`block-${block.id}-max`}
              label="Máximo"
              type="number"
              value={String(block.max)}
              onChange={(e) => onChange({ ...block, max: Number(e.target.value) || 0 })}
              disabled={disabled}
            />
          </Row>
          <Row gap="8" vertical="center">
            <Switch
              isChecked={block.showLabel}
              onToggle={() => onChange({ ...block, showLabel: !block.showLabel })}
              ariaLabel="Mostrar etiqueta de porcentaje"
              disabled={disabled}
            />
            <Text variant="body-default-s" onBackground="neutral-weak">
              Mostrar etiqueta
            </Text>
          </Row>
          <ProgressBar
            value={block.value}
            min={block.min}
            max={block.max}
            label={block.showLabel}
          />
        </Column>
      )}

      {!collapsed && block.type === "avatarGroup" && (
        <Column gap="12">
          {block.avatars.length > 0 && (
            <Row gap="8" wrap>
              {block.avatars.map((avatar) => (
                <Row
                  key={avatar.id}
                  gap="8"
                  vertical="center"
                  radius="full"
                  border="neutral-alpha-weak"
                  paddingLeft="8"
                  paddingRight="4"
                  paddingY="4"
                  background="surface"
                >
                  {avatar.url ? (
                    <Avatar src={avatar.url} size="xs" />
                  ) : (
                    <Avatar value={avatar.initials || "?"} size="xs" />
                  )}
                  <Text variant="label-default-s" onBackground="neutral-strong">
                    {avatar.name || avatar.username || avatar.initials || "Colaborador"}
                  </Text>
                  <IconButton
                    icon="close"
                    variant="tertiary"
                    size="s"
                    tooltip="Quitar colaborador"
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...block,
                        avatars: block.avatars.filter((a) => a.id !== avatar.id),
                      })
                    }
                  />
                </Row>
              ))}
            </Row>
          )}
          {block.avatars.length < MAX_COLLABORATORS ? (
            <CollaboratorSearch
              disabled={disabled}
              excludeIds={block.avatars.map((a) => a.id)}
              onAdd={(partner) =>
                onChange({ ...block, avatars: [...block.avatars, partnerToAvatar(partner)] })
              }
            />
          ) : (
            <Text variant="body-default-xs" onBackground="neutral-weak">
              Máximo {MAX_COLLABORATORS} colaboradores por sección.
            </Text>
          )}
          {block.avatars.filter((a) => a.url || a.initials).length > 0 && (
            <AvatarGroup
              size="m"
              avatars={block.avatars
                .filter((a) => a.url || a.initials)
                .map((a) => (a.url ? { src: a.url } : { value: a.initials }))}
            />
          )}
        </Column>
      )}

      {!collapsed && block.type === "logoCloud" && (
        <Column gap="12">
          <Input
            id={`block-${block.id}-columns`}
            label="Columnas"
            type="number"
            value={String(block.columns)}
            onChange={(e) => onChange({ ...block, columns: Number(e.target.value) || 1 })}
            disabled={disabled}
          />
          <Row gap="12" wrap>
            {block.logos.map((logo) => (
              <Column key={logo.id} gap="8" style={{ width: "8rem" }}>
                <MediaUpload
                  aspectRatio="1"
                  accept="image/*"
                  compress
                  resizeMaxWidth={800}
                  resizeMaxHeight={800}
                  initialPreviewImage={logo.url || null}
                  emptyState="Logo"
                  onFileUpload={async (file) => {
                    const url = await readFileAsDataUrl(file);
                    onChange({
                      ...block,
                      logos: block.logos.map((l) => (l.id === logo.id ? { ...l, url } : l)),
                    });
                  }}
                />
                <IconButton
                  icon="trash"
                  variant="tertiary"
                  size="s"
                  tooltip="Quitar logo"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...block, logos: block.logos.filter((l) => l.id !== logo.id) })
                  }
                />
              </Column>
            ))}
            {/* Ver GOTCHA junto al tile "Agregar" de avatarGroup: mismo bug de
                reconciliación de React (tile sin `key` reutilizado por
                posición al crecer el array), causa raíz confirmada del "logo
                duplicado" reportado. `key` atado a la longitud del array
                fuerza un remount limpio del MediaUpload en cada add/remove. */}
            <Column key={`add-${block.logos.length}`} gap="8" style={{ width: "8rem" }}>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={800}
                resizeMaxHeight={800}
                emptyState="Agregar"
                onFileUpload={async (file) => {
                  const url = await readFileAsDataUrl(file);
                  onChange({ ...block, logos: [...block.logos, { id: newId(), url }] });
                }}
              />
            </Column>
          </Row>
          {block.logos.filter((l) => l.url).length > 0 && (
            <LogoCloud
              columns={toGridSize(block.columns)}
              logos={block.logos.filter((l) => l.url).map((l) => ({ icon: l.url }))}
            />
          )}
        </Column>
      )}

      {!collapsed && block.type === "scroller" && (
        <Column gap="12">
          <Column gap="8">
            {block.items.map((item, index) => (
              <Row key={item.id} gap="8" vertical="center">
                <Input
                  id={`block-${block.id}-${item.id}-text`}
                  placeholder={`Elemento ${index + 1}`}
                  value={item.text}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      items: block.items.map((i) =>
                        i.id === item.id ? { ...i, text: e.target.value } : i,
                      ),
                    })
                  }
                  disabled={disabled}
                />
                <IconButton
                  icon="trash"
                  variant="tertiary"
                  size="s"
                  tooltip="Quitar elemento"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...block, items: block.items.filter((i) => i.id !== item.id) })
                  }
                />
              </Row>
            ))}
            <Row>
              <IconButton
                icon="plus"
                variant="secondary"
                size="s"
                tooltip="Agregar elemento"
                disabled={disabled}
                onClick={() =>
                  onChange({ ...block, items: [...block.items, { id: newId(), text: "" }] })
                }
              />
            </Row>
          </Column>
          {block.items.filter((i) => i.text.trim()).length > 0 && (
            <Scroller direction="row" fadeColor="page">
              {block.items
                .filter((i) => i.text.trim())
                .map((i) => (
                  <Tag key={i.id} variant="neutral" label={i.text} />
                ))}
            </Scroller>
          )}
        </Column>
      )}

      {!collapsed && block.type === "masonry" && (
        <Column gap="12">
          <Input
            id={`block-${block.id}-columns`}
            label="Columnas"
            type="number"
            value={String(block.columns)}
            onChange={(e) => onChange({ ...block, columns: Number(e.target.value) || 1 })}
            disabled={disabled}
          />
          <Row gap="12" wrap>
            {block.images.map((image) => (
              <Column key={image.id} gap="8" style={{ width: "8rem" }}>
                <MediaUpload
                  aspectRatio="1"
                  accept="image/*"
                  compress
                  resizeMaxWidth={1600}
                  resizeMaxHeight={1600}
                  initialPreviewImage={image.url || null}
                  emptyState="Foto"
                  onFileUpload={async (file) => {
                    const url = await readFileAsDataUrl(file);
                    onChange({
                      ...block,
                      images: block.images.map((i) => (i.id === image.id ? { ...i, url } : i)),
                    });
                  }}
                />
                <Input
                  id={`block-${block.id}-${image.id}-alt`}
                  placeholder="Alt"
                  value={image.alt}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      images: block.images.map((i) =>
                        i.id === image.id ? { ...i, alt: e.target.value } : i,
                      ),
                    })
                  }
                  disabled={disabled}
                />
                <IconButton
                  icon="trash"
                  variant="tertiary"
                  size="s"
                  tooltip="Quitar imagen"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...block,
                      images: block.images.filter((i) => i.id !== image.id),
                    })
                  }
                />
              </Column>
            ))}
            {/* Ver GOTCHA junto al tile "Agregar" de avatarGroup: mismo bug de
                reconciliación de React, causa raíz confirmada del "logo
                duplicado" reportado. `key` atado a la longitud del array
                fuerza un remount limpio del MediaUpload en cada add/remove. */}
            <Column key={`add-${block.images.length}`} gap="8" style={{ width: "8rem" }}>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                emptyState="Agregar"
                onFileUpload={async (file) => {
                  const url = await readFileAsDataUrl(file);
                  onChange({
                    ...block,
                    images: [...block.images, { id: newId(), url, alt: "" }],
                  });
                }}
              />
            </Column>
          </Row>
          {block.images.filter((i) => i.url).length > 0 && (
            <MasonryGrid columns={block.columns}>
              {block.images
                .filter((i) => i.url)
                .map((i) => (
                  <Media key={i.id} src={i.url} alt={i.alt} radius="m" />
                ))}
            </MasonryGrid>
          )}
        </Column>
      )}
    </Column>
  );
}
