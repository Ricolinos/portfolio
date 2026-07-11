"use client";

import {
  AvatarGroup,
  Badge,
  Carousel,
  Column,
  DropdownWrapper,
  EmojiPickerDropdown,
  Feedback,
  Icon,
  IconButton,
  Input,
  Line,
  LogoCloud,
  MasonryGrid,
  Media,
  Option,
  ProgressBar,
  Row,
  Scroller,
  Select,
  StatusIndicator,
  Switch,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useEffect, useRef, useState } from "react";
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

export type TextBlockAlign = "left" | "center" | "right" | "justify";
export type TextBlockWeight = "default" | "strong" | "light";

export type ContentBlock =
  | {
      id: string;
      type: "text";
      html: string;
      align?: TextBlockAlign;
      weight?: TextBlockWeight;
      italic?: boolean;
    }
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
      avatars: { id: string; url: string; initials: string }[];
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
  { type: "embed", label: "Código", icon: "codeBracket" },
  { type: "link", label: "Links", icon: "openLink" },
  { type: "video", label: "Video", icon: "film" },
  { type: "divider", label: "Divisor", icon: "divider" },
  { type: "tag", label: "Etiqueta", icon: "shapes" },
  { type: "badge", label: "Insignia", icon: "sparkles" },
  { type: "status", label: "Estado", icon: "infoCircle" },
  { type: "progress", label: "Barra de progreso", icon: "refreshCw" },
  { type: "avatarGroup", label: "Grupo de avatares", icon: "userGroup" },
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
      return { id: newId(), type, language: "bash", code: "" };
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

// FEATURE (tamaños de texto/títulos): el editor permite convertir la línea
// del cursor en h2/h3/h4 vía `document.execCommand("formatBlock", ...)` (ver
// RichTextEditor), que dentro del contentEditable deja un <h2>/<h3>/<h4>
// LITERAL en el `innerHTML` guardado. GOTCHA CRÍTICO verificado contra el
// propio comentario de mdx.tsx (case study "3 negocios ideas"): MDX compila
// HTML embebido literal (no producido por sintaxis Markdown `#`/`##`) como
// JSX con el nombre de tag a secas —`_jsx("h2", {...})`—, NUNCA como
// `_jsx(_components.h2, ...)`; el mapa de `components` de mdx.tsx
// (createHeading → HeadingLink con estilos Once UI) solo se activa para
// headings generados por la sintaxis Markdown real. Un <h2> literal dentro
// del <Text> del bloque escaparía ese mapeo y saldría con el h2 nativo del
// navegador (sin token tipográfico de Once UI, sin id de ancla). Por eso,
// antes de serializar, se extraen los h2/h3/h4 de nivel superior del HTML del
// bloque y se emiten como Markdown ATX puro (`## texto`) en su PROPIA línea,
// AFUERA de cualquier <Text>: eso sí pasa por el parser de Markdown real
// (remark) y llega a `components.h2` con el estilo completo de Once UI. El
// resto del contenido (párrafos normales) conserva el <Text> de siempre.
//
// BUG CONFIRMADO (auditoría con Playwright, ver reporte): cuando el heading
// llevaba el atributo `align` (centrado/derecha/justificado vía la barra de
// alineación por párrafo, ver `alignCurrentParagraph`), este camino ATX puro
// lo descartaba por completo — `node.textContent` no incluye atributos, así
// que `## texto` no transporta ninguna alineación y la vista pública SIEMPRE
// pintaba el heading a la izquierda aunque el editor mostrara el atributo
// correcto en el h2. Confirmado en las 3 capas: DOM del editor con
// `<h2 align="center">`, markdown guardado como `## texto` (sin rastro del
// align), visor público sin `style`/atributo de alineación en el `<h2>`
// resultante. FIX: cuando el heading SÍ tiene align explícito (no "left"), se
// emite como JSX literal `<Heading as="h2" align="center" ...>texto</Heading>`
// en vez de `##` — `Heading` ya está registrado tal cual en el mapa de
// `components` de mdx.tsx (import directo de Once UI, no wrapper propio), así
// que SÍ pasa por él (JSX con nombre en mayúscula, a diferencia del gotcha de
// arriba que solo aplica a HTML embebido con tag en minúscula) y su prop
// `align` es real (Heading.js aplica `textAlign` vía `style` DESDE el propio
// componente en render, no un `style=` escrito a mano en el Markdown fuente,
// así que `stripInlineStyleAttrs` de mdx.tsx —que solo limpia el texto fuente
// crudo— no lo toca). Se pierde el ícono de "copiar link" de `HeadingLink`
// para ESE heading puntual (tradeoff aceptado: `Heading` no trae esa afordancia,
// y replicarla requeriría duplicar su lógica de slug/clipboard aquí), pero se
// mantiene variant/tipografía Once UI idéntica a la del heading ATX (mismo
// mapeo de tamaño que `variantMap` de HeadingLink.js). Headings SIN align
// explícito siguen su camino ATX de siempre (parte, sin cambios de
// comportamiento para el caso común).
type TextSegment =
  | { type: "text"; html: string }
  | { type: "heading"; level: 2 | 3 | 4; text: string; align?: TextBlockAlign };

const HEADING_TAG_LEVEL: Record<string, 2 | 3 | 4> = { H2: 2, H3: 3, H4: 4 };

// Mismo mapeo que `variantMap` de HeadingLink.js (harness Once UI): variant
// tipográfico real por nivel de heading, para que un heading alineado (ruta
// JSX) se vea idéntico en tamaño/peso a uno sin alinear (ruta ATX).
const HEADING_VARIANT: Record<2 | 3 | 4, string> = {
  2: "heading-strong-xl",
  3: "heading-strong-l",
  4: "heading-strong-m",
};

// El texto de un heading pasa a vivir como children de JSX (`<Heading>texto
// </Heading>`) en vez de texto plano de Markdown ATX (`## texto`): a
// diferencia del ATX (donde `{`/`<` no tienen significado especial), dentro
// de children JSX SÍ lo tienen (expresión `{...}` / posible tag nuevo). Se
// escapan a entidades HTML para que el heading centrado no trone/pierda texto
// si el usuario tecleó esos caracteres — el heading ya se aplana a texto
// plano de por sí (ver comentario de `splitTextBlockHtml`), así que no hace
// falta preservar ningún markup interno.
function escapeJsxText(value: string): string {
  return value.replace(/[{}<>]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function splitTextBlockHtml(html: string): TextSegment[] {
  // blockToMarkdown solo corre en el navegador (useMemo dentro de
  // CreateProjectModal, "use client"): usar el propio DOM para parsear es
  // más confiable que un regex contra HTML arbitrario del contentEditable.
  if (typeof document === "undefined") return [{ type: "text", html }];
  const container = document.createElement("div");
  container.innerHTML = html;
  const hasHeading = Array.from(container.children).some(
    (child) => child.tagName in HEADING_TAG_LEVEL,
  );
  if (!hasHeading) return [{ type: "text", html }];

  const segments: TextSegment[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer.trim()) segments.push({ type: "text", html: buffer });
    buffer = "";
  };
  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName in HEADING_TAG_LEVEL) {
      flush();
      const level = HEADING_TAG_LEVEL[(node as Element).tagName];
      // ATX heading de una sola línea: se aplana cualquier formato inline
      // interno (negrita/cursiva/enlace) a texto plano — un heading Once UI
      // ya trae su propio peso tipográfico fuerte, y anidar Markdown dentro
      // de un heading generado a mano abre más GOTCHAs de los que resuelve.
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      const rawAlign = (node as Element).getAttribute("align");
      const align =
        rawAlign === "center" || rawAlign === "right" || rawAlign === "justify"
          ? rawAlign
          : undefined;
      if (text) segments.push({ type: "heading", level, text, align });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      buffer += (node as Element).outerHTML;
    } else {
      buffer += node.textContent ?? "";
    }
  });
  flush();
  return segments;
}

// Serializa un segmento de párrafo normal: es el mismo cuerpo que antes
// serializaba TODO el bloque de una sola vez (ver blame), ahora reutilizable
// por segmento cuando el bloque se partió por headings.
function serializeTextSegment(
  html: string,
  align: TextBlockAlign,
  weight: TextBlockWeight,
  italic: boolean,
): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  // Camino "sin cambios" (todo default): serializa IDÉNTICO a como
  // siempre — no ensucia el Markdown de las piezas que no tocan la
  // barra de estilo del bloque.
  if (align === "left" && weight === "default" && !italic) {
    return `<Text variant="body-default-m" onBackground="neutral-medium">\n${trimmed}\n</Text>`;
  }
  // Con cualquier override, `variant` deja de usarse: Text.js (Once UI)
  // IGNORA `size`/`weight` por completo cuando `variant` está presente
  // (ver dist/components/Text.js — `classes = variant ? getVariantClasses(variant)
  // : [sizeClass, weightClass]`), así que `weight="strong"` junto a
  // `variant="body-default-m"` no aplicaría nada. Se reconstruye la
  // misma tipografía body/m con `family`+`size` sueltos para poder
  // sumar `weight`/`align` reales.
  // "light" no existe como TextWeight real de Once UI (solo
  // "default"|"strong", ver ai/components/Text.json del harness): se
  // aproxima con `onBackground="neutral-weak"` (color atenuado, prop
  // real) en vez de un peso tipográfico inexistente.
  const onBackground = weight === "light" ? "neutral-weak" : "neutral-medium";
  const attrs = [`family="body"`, `size="m"`, `onBackground="${onBackground}"`];
  if (align !== "left") attrs.push(`align="${align}"`);
  if (weight === "strong") attrs.push(`weight="strong"`);
  // GOTCHA (verificado en pantalla contra la pieza real de prueba):
  // cuando el contenido del bloque queda en su PROPIA línea dentro del
  // <Text> (con saltos de línea antes/después, como en el camino
  // "default" de arriba), MDX lo trata como contenido de bloque y lo
  // envuelve en un <p> — que este mismo archivo mapea a `createParagraph`
  // (ver mdx.tsx), el cual fuerza SIEMPRE `onBackground="neutral-medium"`
  // sin importar el `onBackground` del <Text> exterior. Ese doble
  // envoltorio ya existía en el camino "default" (inofensivo ahí: ambos
  // niveles pintan "neutral-medium", así que nadie lo notó), pero con
  // weight="light" (mapeado a onBackground="neutral-weak" en el Text
  // exterior) el <p> interno gana la pulseada de color y el texto se ve
  // igual de oscuro que el normal — el "aligerado" se pierde por
  // completo en la vista pública aunque el editor sí lo muestre bien.
  // Mantener el contenido PEGADO a las etiquetas (sin su propia línea)
  // evita que MDX lo trate como bloque aparte: así llega como contenido
  // en línea del propio <Text>, sin el <p>/createParagraph de por medio.
  const content = italic ? `<em>${trimmed}</em>` : trimmed;
  return `<Text ${attrs.join(" ")}>${content}</Text>`;
}

function blockToMarkdown(block: ContentBlock): string {
  switch (block.type) {
    case "text": {
      const html = block.html.trim();
      if (!html) return "";
      const align = block.align ?? "left";
      const weight = block.weight ?? "default";
      const italic = block.italic ?? false;
      const segments = splitTextBlockHtml(html);
      const parts = segments.map((segment) => {
        if (segment.type !== "heading") {
          return serializeTextSegment(segment.html, align, weight, italic);
        }
        // Ver GOTCHA extenso junto a `TextSegment`/`escapeJsxText`: un heading
        // sin align sigue el camino ATX de siempre (con anchor de copiar
        // link); uno CON align se emite como `Heading` real de Once UI para
        // que la alineación sobreviva a la vista pública.
        if (!segment.align) return `${"#".repeat(segment.level)} ${segment.text}`;
        const tag = `h${segment.level}` as "h2" | "h3" | "h4";
        return `<Heading as="${tag}" variant="${HEADING_VARIANT[segment.level]}" align="${segment.align}" marginTop="24" marginBottom="12">${escapeJsxText(segment.text)}</Heading>`;
      });
      return parts.filter((part) => part.trim() !== "").join("\n\n");
    }
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
    case "embed": {
      if (!block.code.trim()) return "";
      // Un fence de 3 backticks trunca si el propio código pegado por el
      // usuario ya contiene una racha de 3+ backticks (ej. un snippet que
      // documenta Markdown): remark cierra el bloque en la PRIMERA racha
      // igual o mayor a la de apertura. Se usa un fence 1 backtick más largo
      // que la racha más larga encontrada en el código (mínimo 3) para que
      // el contenido nunca lo pueda cerrar antes de tiempo.
      const longestBacktickRun = Math.max(
        0,
        ...(block.code.match(/`+/g)?.map((run) => run.length) ?? [0]),
      );
      const fence = "`".repeat(Math.max(3, longestBacktickRun + 1));
      return `${fence}${block.language}\n${block.code}\n${fence}`;
    }
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
      // Once UI, props planas) dentro de una Row.
      const items = avatars
        .map((a) =>
          a.url
            ? `  <Avatar src="${escapeAttr(a.url)}" size="m" />`
            : `  <Avatar value="${escapeAttr(a.initials.trim())}" size="m" />`,
        )
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
        .map(
          (i) =>
            `  <Media src="${escapeAttr(i.url)}" alt="${escapeAttr(i.alt)}" radius="m" />`,
        )
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
// NOTA (Select de fuente/tamaño, intento 1, retirado): `applyStyle` envolvía
// la selección en un `<span style="...">` — pero el visor público
// (src/components/mdx.tsx, commit 77d966c, fix del HTML pegado de Word/Docs)
// elimina cualquier atributo `style` inline en strings, así que ese span
// jamás llegaba a verse en la pieza publicada aunque el editor lo mostrara
// bien. Además, con selección colapsada `wrapSelection` no hacía nada (retorno
// temprano), y los Select en sí se veían recortados/desalineados en esta
// barra.
// Intento 2 (el que sí quedó, ver `HEADING_FORMAT_OPTIONS`/`setBlockFormat`
// en RichTextEditor): en vez de `style`, se usa `document.execCommand(
// "formatBlock", ...)` para envolver la línea del cursor en h2/h3/h4 —tags
// reales, no atributos— y en `blockToMarkdown` esos headings se extraen y se
// re-emiten como Markdown `##`/`###` puro (ver `splitTextBlockHtml`), que sí
// sobrevive el pipeline completo y llega con el estilo Once UI real (pasa por
// `components.h2` de mdx.tsx). Mismo criterio de siempre: lo que no puede
// verse en el visor se quita del editor; lo que si sobrevive, se implementa.

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

// Lenguajes soportados por el `CodeBlock` real de Once UI (Prism.js, ver
// `languageDependencies` en dist/modules/code/CodeBlock.impl.js): estos son
// standalone (sin dependencias extra) salvo "javascript"/"typescript", que
// el propio componente resuelve solo. "" (Texto plano) desactiva el
// resaltado de sintaxis pero conserva la barra completa + botón de copiar.
const CODE_LANGUAGE_OPTIONS: { label: string; value: string }[] = [
  { label: "Bash / Shell", value: "bash" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "CSS", value: "css" },
  { label: "HTML", value: "html" },
  { label: "JSON", value: "json" },
  { label: "Texto plano", value: "" },
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
  align: TextBlockAlign;
  weight: TextBlockWeight;
  italic: boolean;
  onChange: (html: string) => void;
  onAlignChange: (align: TextBlockAlign) => void;
  onWeightChange: (weight: TextBlockWeight) => void;
  onItalicChange: (italic: boolean) => void;
  disabled?: boolean;
}

const ALIGN_OPTIONS: { value: TextBlockAlign; icon: string; label: string }[] = [
  { value: "left", icon: "alignLeft", label: "Izquierda" },
  { value: "center", icon: "alignCenter", label: "Centro" },
  { value: "right", icon: "alignRight", label: "Derecha" },
  { value: "justify", icon: "alignJustify", label: "Justificado" },
];

// FEATURE (tamaños de texto): opciones del Select de la toolbar. El value
// coincide con el tag real que arma `document.execCommand("formatBlock", ...)`
// ("p" = cuerpo/sin formato de bloque).
type HeadingFormat = "p" | "h2" | "h3" | "h4";
const HEADING_FORMAT_OPTIONS: { value: HeadingFormat; label: string }[] = [
  { value: "p", label: "Cuerpo" },
  { value: "h2", label: "Título" },
  { value: "h3", label: "Subtítulo" },
  { value: "h4", label: "Encabezado pequeño" },
];
// Abreviatura mostrada en el trigger compacto (ver nota en la barra de
// RichTextEditor): reemplaza al <Select> —desentonaba en altura con el resto
// de la fila (38px medido vs 24px de los IconButton size="s", ver
// IconButton.module.scss/.s y Input.module.scss/.s del harness: no existe una
// altura de Select que baje de 40px)— por un IconButton+DropdownWrapper, el
// mismo patrón que ya usan BlockTypePicker (el "+" del lienzo) y
// EmojiPickerDropdown en este mismo flujo.
const HEADING_FORMAT_ABBR: Record<HeadingFormat, string> = {
  p: "P",
  h2: "H2",
  h3: "H3",
  h4: "H4",
};

// Alineación POR PÁRRAFO (tarea 4): investigado y confirmado con Playwright
// (test_align.mjs, descartado tras la prueba) que `document.execCommand(
// "justifyCenter"/...)` en Chromium SIEMPRE deja `style="text-align: ..."` en
// el elemento —incluso forzando `execCommand("styleWithCSS", false, false)`,
// que en teoría debería preferir tags/atributos sobre CSS—, y ese `style`
// es EXACTAMENTE lo que `stripInlineStyleAttrs` en mdx.tsx elimina (el
// sanitizador anti-HTML-de-Word). Alinear por párrafo vía execCommand se
// vería bien en el editor y se perdería por completo en la vista pública.
// Alternativa verificada que SÍ sobrevive: el atributo HTML clásico `align`
// (deprecado pero real, no `style`) en el elemento de bloque del párrafo
// (p/div/h2/h3/h4). Confirmado en 3 capas: (1) el navegador SÍ lo interpreta
// sin CSS propio (computed text-align pasa a "-webkit-left/-center/-right" o
// "justify" con solo el atributo, sin ninguna regla CSS de por medio); (2)
// `stripInlineStyleAttrs` solo filtra `style=`, no `align=`, así que
// sobrevive intacto al sanitizador; (3) React SÍ reenvía `align` como
// atributo DOM real en un host element nativo como "p" (probado con
// renderToStaticMarkup), que es justo la ruta que toma MDX para HTML
// embebido literal (ver GOTCHA de mdx.tsx sobre `_jsx("p", {...})`). Por eso
// el grupo de alineación de la toolbar ya NO cambia `block.align` (el
// bloque completo) sino que aplica/quita el atributo `align` en el elemento
// de bloque (p/div/h2/h3/h4) donde vive el cursor — cada línea/párrafo se
// alinea de forma independiente. `block.align`/`onAlignChange` se conservan
// solo como fallback para el caso raro de un bloque sin NINGÚN elemento de
// bloque interno (texto suelto directo en el contentEditable, sin línea
// propia todavía) y para no romper la serialización de piezas ya guardadas
// con ese campo.
const BLOCK_LEVEL_TAGS = new Set(["P", "DIV", "H2", "H3", "H4", "LI", "BLOCKQUOTE"]);

function getBlockAncestor(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE && BLOCK_LEVEL_TAGS.has((current as HTMLElement).tagName)) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

// BUG CONFIRMADO (auditoría con Playwright, "el ajuste de alineación a veces
// se ignora" — HIPÓTESIS B): en Chromium, la PRIMERA línea de un bloque de
// texto tecleada directo en el contentEditable (antes de cualquier Enter)
// vive como un text-node SUELTO, hijo directo del `<div ref>` — sin ningún
// `<p>`/`<div>` propio. Solo las líneas creadas DESPUÉS de presionar Enter
// quedan envueltas en su propio `<div>`. Verificado en pantalla: `getBlockAncestor`
// no encuentra ningún ancestro de bloque para ese texto suelto, así que
// `alignCurrentParagraph` cae al fallback legado (`onAlignChange`, alinea
// `block.align` ENTERO) — el usuario alinea "solo esa línea" y en realidad
// alinea/desalinea TODO el bloque, incluidas líneas posteriores ya envueltas
// en su propio `<div>` con su PROPIO `align` independiente. De ahí la
// intermitencia percibida: "a veces" el cursor cae en una línea con `<div>`
// propio (funciona bien, por párrafo) y "a veces" cae en la primera línea
// suelta (alinea todo el bloque, pisando lo demás).
// FIX: normalizar el contenido para que TODO viva dentro de un elemento de
// bloque propio desde el primer momento, casi eliminando el caso del
// fallback. `ensureBlockWrapping` envuelve cada tramo consecutivo de nodos
// sueltos (texto o inline) en su propio `<div>`, preservando orden y
// contenido; se invoca solo cuando `html` llega actualizado desde AFUERA
// (montaje inicial de un bloque nuevo, o carga de una pieza guardada para
// Editar) — nunca durante la edición activa del usuario, para no arriesgar
// saltos de cursor.
function ensureBlockWrapping(el: HTMLElement): boolean {
  let changed = false;
  const run: ChildNode[] = [];
  const hasRealContent = () =>
    run.some(
      (n) =>
        (n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "") ||
        n.nodeType === Node.ELEMENT_NODE,
    );
  const flush = () => {
    if (run.length > 0 && hasRealContent()) {
      const wrapper = document.createElement("div");
      el.insertBefore(wrapper, run[0]);
      run.forEach((node) => wrapper.appendChild(node));
      changed = true;
    }
    run.length = 0;
  };
  Array.from(el.childNodes).forEach((node) => {
    const isBlock =
      node.nodeType === Node.ELEMENT_NODE && BLOCK_LEVEL_TAGS.has((node as Element).tagName);
    if (isBlock) {
      flush();
    } else {
      run.push(node);
    }
  });
  flush();
  return changed;
}

// Semilla de un bloque de texto totalmente vacío (nunca se escribió nada
// todavía): un `<div>` con un `<br>` propio, para que la PRIMERA tecla que el
// usuario escriba caiga DENTRO de ese elemento de bloque (comportamiento
// nativo de Chromium al posicionar el caret en un contentEditable con un solo
// hijo elemento) en vez de crear, de nuevo, un text-node suelto directo del
// contentEditable — ver GOTCHA de `ensureBlockWrapping` arriba.
const EMPTY_TEXT_BLOCK_SEED = "<div><br></div>";

function RichTextEditor({
  html,
  align,
  weight,
  italic,
  onChange,
  onAlignChange,
  onWeightChange,
  onItalicChange,
  disabled,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // BUG CRÍTICO (texto guardado desaparece al reabrir con "Editar"): este
  // ref arrancaba en `useRef(html)` — con el `html` que llega YA cargado
  // (ej. al precargar una pieza guardada para editar). El div (sin
  // `dangerouslySetInnerHTML`) siempre arranca vacío en el DOM real; el
  // El efecto de abajo solo escribe `innerHTML` cuando `html !== lastEmitted.current`,
  // así que en el PRIMER montaje ambos ya eran iguales y nunca se copiaba el
  // contenido al DOM — el editor se veía vacío aunque `block.html` sí tuviera
  // el texto (y al guardar de nuevo, se perdía). Arrancar en "" fuerza que el
  // primer montaje con contenido real siempre difiera y dispare la escritura.
  const lastEmitted = useRef("");
  // Última selección (Range) capturada MIENTRAS vivía dentro del editor.
  // GOTCHA (bug del emoji cayendo al inicio): al abrir el EmojiPickerDropdown
  // (o los Select de fuente/tamaño), el foco del documento se mueve fuera del
  // contentEditable — la búsqueda del picker de emoji autoenfoca su propio
  // <Input>, y los Select internamente enfocan su trigger. En ese momento el
  // `Selection` global deja de tener un Range dentro del editor. El código
  // viejo llamaba `ref.current?.focus()` justo antes de leer
  // `window.getSelection()`: el foco SÍ vuelve al div, pero como el
  // navegador ya no tenía un Range asociado a él, coloca el caret en la
  // posición 0 por defecto (comportamiento nativo de `.focus()` en
  // contentEditable sin selección previa) — de ahí que el emoji (o el
  // wrap de negrita/cursiva vía los Select) aterrizara siempre al inicio.
  // La solución: rastrear el Range activo con `selectionchange` mientras
  // esté dentro de este editor, y restaurarlo explícitamente ANTES de
  // cualquier operación de la toolbar, en vez de confiar en dónde el
  // navegador decida dejar el caret al reenfocar.
  const lastRangeRef = useRef<Range | null>(null);
  // Estado "vivo" de la selección actual, para resaltar el botón/Select
  // correcto de la toolbar (negrita activa, tamaño del párrafo del cursor,
  // alineación del párrafo del cursor) — se recalcula en cada
  // `selectionchange` dentro de este editor, igual que `lastRangeRef`.
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });
  const [blockFormat, setBlockFormat] = useState<HeadingFormat>("p");
  const [paragraphAlign, setParagraphAlign] = useState<TextBlockAlign>(align);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);

  // Solo sincroniza el DOM cuando el cambio viene de afuera (ej. al cargar
  // un borrador): si lo hiciéramos en cada emit, el cursor saltaría al
  // inicio en cada tecla.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (html !== lastEmitted.current) {
      el.innerHTML = html;
      lastEmitted.current = html;
      // HIPÓTESIS B (ver GOTCHA junto a `ensureBlockWrapping`): normaliza
      // contenido cargado desde afuera (ej. una pieza guardada ANTES de este
      // fix, con texto suelto sin envoltorio propio) para que el fallback de
      // alineación de bloque completo casi nunca se necesite de aquí en
      // adelante. Si wrapping cambió algo, se propaga con `onChange` para que
      // `block.html` (y lo que se guarde si el usuario no vuelve a tocar este
      // bloque) ya refleje el contenido normalizado.
      if (ensureBlockWrapping(el)) {
        lastEmitted.current = el.innerHTML;
        onChange(lastEmitted.current);
      }
    }
    // Bloque totalmente vacío (nunca se escribió nada, ej. recién agregado
    // desde "Añadir sección"): sembrar un `<div>` propio para que la PRIMERA
    // tecla ya caiga dentro de un elemento de bloque (ver
    // `EMPTY_TEXT_BLOCK_SEED`) en vez de quedar como texto suelto. No emite
    // `onChange`: el bloque sigue "vacío" (`block.html === ""`) hasta que el
    // usuario escriba contenido real.
    if (el.childNodes.length === 0) {
      el.innerHTML = EMPTY_TEXT_BLOCK_SEED;
    }
  }, [html, onChange]);

  // BUG INTERMITENTE (el estilo elegido a veces no se aplica — reproducido
  // con Playwright disparando dos clicks de la toolbar en el mismo tick de
  // JS, ej. Negrita luego Cursiva sin ceder el hilo entre medio): la causa
  // raíz NO era el listener de `selectionchange` en sí, sino que
  // `restoreSelection` (ver abajo) confiaba CIEGAMENTE en `lastRangeRef`
  // (llenado solo por ese listener, asíncrono) y lo usaba para PISAR la
  // selección viva del navegador, incluso cuando esa selección viva ya era
  // perfectamente válida. Verificado en pantalla con el propio
  // `window.getSelection()`: justo después de que `execCommand("bold")`
  // corre, la Selection real del documento YA apunta, en el MISMO tick
  // síncrono, al nodo de texto correcto dentro del `<b>` recién creado — el
  // evento `selectionchange` que actualiza `lastRangeRef` llega DESPUÉS,
  // como tarea encolada por el navegador. Si el siguiente click de la
  // toolbar (ej. Cursiva) llega antes de que ese evento encolado se procese,
  // `lastRangeRef` todavía apunta al Range VIEJO (de antes del bold), cuyo
  // nodo contenedor de texto normalmente ya fue reemplazado/desprendido del
  // documento por el propio `execCommand` — `el.contains(saved...)` da
  // `false`, y `restoreSelection` caía al último fallback: colapsar el
  // cursor al FINAL del contenido. Cursiva entonces corría sobre una
  // selección colapsada (no aplica ningún wrap visible) en vez de sobre el
  // texto recién puesto en negrita — de ahí el "a veces no se aplica".
  // FIX: `restoreSelection` ahora SIEMPRE revisa primero la selección VIVA
  // del documento; si ya cae dentro del editor (el caso normal tras
  // cualquier `execCommand`, o cuando el foco nunca salió del todo — los
  // botones simples no le quitan la Selection al documento aunque muevan
  // `document.activeElement`), la usa tal cual y refresca `lastRangeRef` con
  // ella al vuelo, sin esperar al evento asíncrono. `lastRangeRef` +
  // `selectionchange` se conservan solo como red de respaldo para el caso
  // que sí los necesita: cuando el foco se fue a un control que SÍ le quita
  // la selección al documento (el Select viejo, el buscador del emoji
  // picker) y hay que restaurar manualmente dónde estaba el cursor antes de
  // que eso pasara.
  const syncSelectionState = () => {
    const el = ref.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    lastRangeRef.current = range.cloneRange();
    // queryCommandState/Value son APIs deprecadas pero universales (única
    // forma estándar de leer el estado de toggle real de execCommand); se
    // envuelven en try/catch porque algunos navegadores las marcan como
    // inseguras/lanzan fuera de un documento con foco activo.
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
      });
    } catch {
      // no-op: se conserva el último estado conocido.
    }
    const blockEl = getBlockAncestor(range.commonAncestorContainer, el);
    const tag = blockEl?.tagName;
    setBlockFormat(tag === "H2" || tag === "H3" || tag === "H4" ? (tag.toLowerCase() as HeadingFormat) : "p");
    const attrAlign = blockEl?.getAttribute("align");
    setParagraphAlign(
      attrAlign === "center" || attrAlign === "right" || attrAlign === "justify" ? attrAlign : "left",
    );
  };

  useEffect(() => {
    document.addEventListener("selectionchange", syncSelectionState);
    return () => document.removeEventListener("selectionchange", syncSelectionState);
  }, []);

  const emit = () => {
    if (!ref.current) return;
    lastEmitted.current = ref.current.innerHTML;
    onChange(lastEmitted.current);
  };

  // Restaura el último Range guardado dentro del editor (o, si nunca hubo
  // uno —editor recién montado/vacío, o el guardado quedó obsoleto—, coloca
  // el caret al final del contenido) y lo aplica al `Selection` del
  // documento. Debe llamarse SOLO cuando ya se determinó (en `focusEditor`,
  // ANTES de mover el foco) que la Selection viva NO está dentro del
  // editor — ver GOTCHA extenso ahí sobre por qué el orden importa.
  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection) return;
    const saved = lastRangeRef.current;
    if (saved && el.contains(saved.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(saved);
      return;
    }
    const fallback = document.createRange();
    fallback.selectNodeContents(el);
    fallback.collapse(false);
    selection.removeAllRanges();
    selection.addRange(fallback);
  };

  // Reenfoca el editor y restablece la selección real ANTES de mutar el
  // DOM: todas las acciones de la toolbar (bold/italic/underline/
  // strikethrough, fuente/tamaño, link, emoji) pasan por aquí en vez de
  // solo `ref.current?.focus()`.
  //
  // BUG INTERMITENTE (el estilo elegido a veces no se aplica) — DOS causas
  // raíz relacionadas, ambas reproducidas con Playwright disparando la
  // toolbar sin ceder el hilo entre acciones:
  //
  // (1) Dos clicks de la toolbar seguidos (ej. Negrita → Cursiva) SIN que el
  // navegador alcance a procesar el evento `selectionchange` de por medio:
  // justo después de `execCommand("bold")`, la Selection VIVA del documento
  // ya apunta (en el MISMO tick síncrono) al nodo de texto correcto dentro
  // del `<b>` recién creado, pero el evento `selectionchange` que actualiza
  // `lastRangeRef` llega DESPUÉS, como tarea encolada por el navegador.
  // Llamar SIEMPRE a `restoreSelection()` (que solo conoce `lastRangeRef`,
  // desactualizado en ese instante) pisaba esa Selection viva y correcta con
  // el Range VIEJO —cuyo nodo contenedor normalmente ya fue reemplazado por
  // el propio `execCommand`, así que ni siquiera es un Range válido— y
  // `restoreSelection` caía al fallback de colapsar el cursor al FINAL del
  // contenido. Cursiva corría entonces sobre una selección colapsada (no
  // aplica ningún wrap visible) en vez de sobre el texto recién puesto en
  // negrita.
  //
  // (2) La corrección obvia de (1) —"confiar en la Selection viva si ya cae
  // dentro del editor, antes que en `lastRangeRef`"— reintroduce, si se hace
  // DESPUÉS de `el.focus()`, el bug ORIGINAL que este mismo Range cacheado
  // vino a resolver (emoji/Select cayendo al inicio, ver GOTCHA de
  // `lastRangeRef` más arriba): reproducido con Playwright posicionando el
  // cursor a medio texto, abriendo el emoji picker y escribiendo en su
  // buscador (un <Input> real, que SÍ le quita la Selection al documento,
  // a diferencia de un botón simple) — `el.focus()` en un contentEditable
  // que en ESE instante no tiene ninguna Selection propia asociada coloca,
  // como comportamiento nativo del navegador, un caret colapsado en la
  // posición 0 DENTRO del editor — indistinguible de una Selection viva
  // "ya buena" si se revisa recién DESPUÉS de llamar a `.focus()`.
  //
  // FIX: la pregunta "¿la Selection viva ya cae dentro del editor?" se
  // responde ANTES de tocar el foco (ahí SÍ distingue los dos casos: un
  // botón simple nunca le quita la Selection al documento, un <Input> real
  // sí). Si la respuesta es sí, se refresca `lastRangeRef` con esa Selection
  // ya-buena y se deja intacta (nunca se pisa con el Range cacheado ni con
  // el default de `.focus()`) — resuelve (1). Si la respuesta es no, se
  // delega en `restoreSelection()` de siempre (`lastRangeRef` → fallback al
  // final) — conserva la resolución original de (2).
  const focusEditor = () => {
    const el = ref.current;
    const selection = window.getSelection();
    const liveRangeAlreadyInEditor =
      !!el && !!selection && selection.rangeCount > 0 && el.contains(selection.getRangeAt(0).commonAncestorContainer);
    el?.focus();
    if (liveRangeAlreadyInEditor && selection) {
      lastRangeRef.current = selection.getRangeAt(0).cloneRange();
      return;
    }
    restoreSelection();
  };

  // TOGGLE real (tarea 2): `document.execCommand("bold"/"italic"/
  // "underline"/"strikeThrough")` reemplaza a `wrapSelection` para estos 4
  // botones. A diferencia de `wrapSelection` (que solo AGREGABA un
  // <strong>/<em>/<u>/<s> nuevo sin poder quitarlo, y anidaba tags si se
  // repetía), execCommand es un toggle nativo del navegador: reaplicar
  // "bold" sobre texto ya en <b> lo QUITA (verificado con Playwright:
  // `<b>x</b>` → "bold" → "x" plano), y además el navegador recuerda el
  // estado de negrita/cursiva/etc. del CARET (no solo de la selección), así
  // que el texto que se escribe después de togglear hereda correctamente el
  // nuevo estado (activado o desactivado) sin heredar el formato viejo a la
  // fuerza. Produce <b>/<i>/<u>/<strike> (no <strong>/<em>/<u>/<s>), pero son
  // tags HTML nativos: el visor los recibe como HTML embebido crudo dentro
  // del <Text> (igual que antes) y el navegador los renderiza con el mismo
  // efecto visual (negrita/cursiva/subrayado/tachado) sin necesitar mapeo en
  // mdx.tsx.
  const toggleInlineFormat = (command: "bold" | "italic" | "underline" | "strikeThrough") => {
    focusEditor();
    document.execCommand(command);
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

  const toggleWeight = (value: TextBlockWeight) => onWeightChange(weight === value ? "default" : value);

  // FEATURE tamaños de texto (tarea 3): convierte el elemento de bloque de la
  // línea del cursor en h2/h3/h4, o de vuelta a un párrafo normal ("p" =
  // Cuerpo). `<h2>` con corchetes (no solo "h2") es necesario para Firefox;
  // Chromium acepta ambas formas (verificado con Playwright).
  //
  // BUG CONFIRMADO (auditoría con Playwright, matriz punto 3 — "alinear →
  // convertir a heading después"): `execCommand("formatBlock", ...)` en
  // Chromium NO conserva el atributo `align` del elemento de bloque viejo al
  // crear el nuevo (verificado en pantalla en ambos sentidos: un
  // `<div align="center">` se convierte en `<h2>` PLANO, sin align; un
  // `<h2 align="center">` se convierte en `<div>` plano al volver a "Cuerpo").
  // El usuario que alinea un párrafo y LUEGO decide convertirlo en título
  // (o viceversa) veía el ajuste de alineación desaparecer sin tocar la
  // barra de alineación — otra causa de la intermitencia percibida. FIX:
  // se lee el `align` del bloque ANTES de la conversión y, si el nuevo
  // elemento de bloque no lo trae de por sí, se reaplica manualmente.
  const setHeadingFormat = (format: HeadingFormat) => {
    focusEditor();
    const el = ref.current;
    const selectionBefore = window.getSelection();
    const prevBlock =
      el && selectionBefore && selectionBefore.rangeCount > 0
        ? getBlockAncestor(selectionBefore.getRangeAt(0).commonAncestorContainer, el)
        : null;
    const prevAlign = prevBlock?.getAttribute("align");
    document.execCommand("formatBlock", false, `<${format}>`);
    if (prevAlign && el) {
      const selectionAfter = window.getSelection();
      const newBlock =
        selectionAfter && selectionAfter.rangeCount > 0
          ? getBlockAncestor(selectionAfter.getRangeAt(0).commonAncestorContainer, el)
          : null;
      if (newBlock && !newBlock.getAttribute("align")) {
        newBlock.setAttribute("align", prevAlign);
        setParagraphAlign(prevAlign as TextBlockAlign);
      }
    }
    setBlockFormat(format);
    emit();
  };

  // Alineación POR PÁRRAFO (tarea 4, ver nota extensa junto a
  // `BLOCK_LEVEL_TAGS` arriba): en vez de aplicar `align` a todo el bloque,
  // busca el elemento de bloque (p/div/h2/h3/h4) donde vive el cursor y le
  // pone/quita el atributo HTML `align` (nunca `style`). Si el cursor está en
  // texto suelto sin ningún elemento de bloque propio todavía (bloque
  // recién creado, una sola línea sin <p>/<div>), no hay nada que aislar:
  // cae al comportamiento legado de bloque completo (`onAlignChange`) para
  // no perder la función en ese caso límite.
  const alignCurrentParagraph = (value: TextBlockAlign) => {
    focusEditor();
    const el = ref.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const blockEl = getBlockAncestor(selection.getRangeAt(0).commonAncestorContainer, el);
    if (!blockEl) {
      onAlignChange(value);
      return;
    }
    if (value === "left") blockEl.removeAttribute("align");
    else blockEl.setAttribute("align", value);
    setParagraphAlign(value);
    emit();
  };

  return (
    <Column fillWidth gap="8" radius="m" border="neutral-alpha-weak" padding="8" background="page">
      {/* Barra única: alineación y tamaño de texto aplican al PÁRRAFO del
          cursor (ver `alignCurrentParagraph`/`setHeadingFormat`), peso "Aa"
          sigue aplicando al bloque completo, y B/I/U/S/enlace/emoji son
          TOGGLES reales sobre el texto seleccionado vía execCommand (ver
          `toggleInlineFormat`). Los toggles de bloque de negrita/cursiva se
          retiraron por duplicar la B/I inline (misma funcionalidad visible,
          dos controles). */}
      <Row gap="4" vertical="center" wrap overflowX="auto">
        {ALIGN_OPTIONS.map((option) => (
          <IconButton
            key={option.value}
            icon={option.icon}
            tooltip={`Alinear párrafo: ${option.label}`}
            variant={paragraphAlign === option.value ? "primary" : "tertiary"}
            size="s"
            onClick={() => alignCurrentParagraph(option.value)}
            disabled={disabled}
          />
        ))}
        <Line vert background="neutral-alpha-weak" height="20" />
        <DropdownWrapper
          isOpen={formatMenuOpen}
          onOpenChange={setFormatMenuOpen}
          placement="bottom-start"
          trigger={
            <IconButton
              tooltip={`Tipo de texto: ${
                HEADING_FORMAT_OPTIONS.find((option) => option.value === blockFormat)?.label ?? "Cuerpo"
              }`}
              variant={blockFormat === "p" ? "tertiary" : "primary"}
              size="s"
              disabled={disabled}
            >
              <Text variant="label-strong-s">{HEADING_FORMAT_ABBR[blockFormat]}</Text>
            </IconButton>
          }
          dropdown={
            <Column minWidth={10} padding="4" gap="2">
              {HEADING_FORMAT_OPTIONS.map((option) => (
                <Option
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  selected={blockFormat === option.value}
                  onClick={() => {
                    setHeadingFormat(option.value as HeadingFormat);
                    setFormatMenuOpen(false);
                  }}
                />
              ))}
            </Column>
          }
        />
        <Line vert background="neutral-alpha-weak" height="20" />
        <IconButton
          icon="textLight"
          tooltip="Peso del bloque: ligera"
          variant={weight === "light" ? "primary" : "tertiary"}
          size="s"
          onClick={() => toggleWeight("light")}
          disabled={disabled}
        />
        <Line vert background="neutral-alpha-weak" height="20" />
        <IconButton
          icon="bold"
          tooltip="Negrita"
          variant={activeFormats.bold ? "primary" : "tertiary"}
          size="s"
          onClick={() => toggleInlineFormat("bold")}
          disabled={disabled}
        />
        <IconButton
          icon="italic"
          tooltip="Cursiva"
          variant={activeFormats.italic ? "primary" : "tertiary"}
          size="s"
          onClick={() => toggleInlineFormat("italic")}
          disabled={disabled}
        />
        <IconButton
          icon="underline"
          tooltip="Subrayado"
          variant={activeFormats.underline ? "primary" : "tertiary"}
          size="s"
          onClick={() => toggleInlineFormat("underline")}
          disabled={disabled}
        />
        <IconButton
          icon="strikethrough"
          tooltip="Tachado"
          variant={activeFormats.strikeThrough ? "primary" : "tertiary"}
          size="s"
          onClick={() => toggleInlineFormat("strikeThrough")}
          disabled={disabled}
        />
        <Line vert background="neutral-alpha-weak" height="20" />
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
        style={{
          minHeight: "6rem",
          outline: "none",
          lineHeight: 1.6,
          textAlign: align,
          fontWeight: weight === "strong" ? "var(--font-weight-display-strong)" : undefined,
          color: weight === "light" ? "var(--neutral-on-background-weak)" : undefined,
          fontStyle: italic ? "italic" : undefined,
        }}
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
}: ContentBlockCardProps) {
  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="m"
      border="neutral-alpha-weak"
      background="page"
    >
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="8" vertical="center">
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

      {block.type === "text" && (
        <RichTextEditor
          html={block.html}
          align={block.align ?? "left"}
          weight={block.weight ?? "default"}
          italic={block.italic ?? false}
          onChange={(next) => onChange({ ...block, html: next })}
          onAlignChange={(align) => onChange({ ...block, align })}
          onWeightChange={(weight) => onChange({ ...block, weight })}
          onItalicChange={(italic) => onChange({ ...block, italic })}
          disabled={disabled}
        />
      )}

      {block.type === "image" && (
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

      {block.type === "carousel" && (
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

      {block.type === "embed" && (
        <Column gap="8">
          <Select
            id={`block-${block.id}-language`}
            label="Lenguaje"
            options={CODE_LANGUAGE_OPTIONS}
            value={block.language}
            onSelect={(value) => onChange({ ...block, language: value })}
            disabled={disabled}
            style={{ width: "12rem" }}
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

      {block.type === "link" && (
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

      {block.type === "video" && (
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

      {block.type === "divider" && (
        <Row fillWidth vertical="center" gap="8">
          <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Línea divisoria
          </Text>
          <Line background="neutral-alpha-medium" style={{ flex: 1 }} />
        </Row>
      )}

      {block.type === "tag" && (
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

      {block.type === "badge" && (
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

      {block.type === "status" && (
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

      {block.type === "progress" && (
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

      {block.type === "avatarGroup" && (
        <Column gap="12">
          <Row gap="12" wrap>
            {block.avatars.map((avatar) => (
              <Column key={avatar.id} gap="8" style={{ width: "8rem" }}>
                <MediaUpload
                  aspectRatio="1"
                  accept="image/*"
                  compress
                  resizeMaxWidth={400}
                  resizeMaxHeight={400}
                  initialPreviewImage={avatar.url || null}
                  emptyState="Foto"
                  onFileUpload={async (file) => {
                    const url = await readFileAsDataUrl(file);
                    onChange({
                      ...block,
                      avatars: block.avatars.map((a) => (a.id === avatar.id ? { ...a, url } : a)),
                    });
                  }}
                />
                <Input
                  id={`block-${block.id}-${avatar.id}-initials`}
                  placeholder="Iniciales"
                  value={avatar.initials}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      avatars: block.avatars.map((a) =>
                        a.id === avatar.id ? { ...a, initials: e.target.value } : a,
                      ),
                    })
                  }
                  disabled={disabled}
                />
                <IconButton
                  icon="trash"
                  variant="tertiary"
                  size="s"
                  tooltip="Quitar avatar"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...block,
                      avatars: block.avatars.filter((a) => a.id !== avatar.id),
                    })
                  }
                />
              </Column>
            ))}
            {/* GOTCHA (defecto "logo duplicado" reportado por el usuario, mismo
                patrón en avatarGroup/masonry): este tile estático de "Agregar"
                convive en el mismo Row que los tiles de `.map()` (esos sí
                llevan `key={item.id}`), pero al no tener `key` propio, React
                lo reconcilia por posición: cuando el array crece, el
                MediaUpload que YA estaba montado en el slot vacío ES el que
                recibió el archivo (su estado interno `previewImage` ya
                apunta al blob recién seleccionado, seteado de forma síncrona
                antes de que `onFileUpload` complete la subida y dispare este
                re-render) — verificado con Playwright: tras un solo upload,
                este tile de "Agregar" sigue mostrando esa preview en vez de
                resetear al ícono "+". Si el usuario, viendo el tile de
                "Agregar" ya "ocupado", vuelve a seleccionar el MISMO archivo
                pensando que no se guardó, sí crea una segunda entrada real
                duplicada (eso es lo que terminó guardado en la pieza real).
                `key` dependiente de la longitud del array fuerza un
                remount limpio (estado `previewImage` en null) cada vez que
                se agrega/quita un ítem. */}
            <Column key={`add-${block.avatars.length}`} gap="8" style={{ width: "8rem" }}>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={400}
                resizeMaxHeight={400}
                emptyState="Agregar"
                onFileUpload={async (file) => {
                  const url = await readFileAsDataUrl(file);
                  onChange({
                    ...block,
                    avatars: [...block.avatars, { id: newId(), url, initials: "" }],
                  });
                }}
              />
            </Column>
          </Row>
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

      {block.type === "logoCloud" && (
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

      {block.type === "scroller" && (
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

      {block.type === "masonry" && (
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
