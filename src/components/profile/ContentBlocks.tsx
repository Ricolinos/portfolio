"use client";

import {
  Avatar,
  AvatarGroup,
  Badge,
  Chip,
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
import { PROJECT_SUBCATEGORIES, PROJECT_VERTICALS } from "@/lib/projectCategories";

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
// FEATURE (tipografía avanzada, tarea 4): color/familia de bloque, mismo
// criterio que `weight`/`italic` — ambos son props STRING reales de `Text`
// (ver ai/components/Text.json: `onBackground: Colors`, `family: TextType`),
// así que sobreviven el GOTCHA de props con llaves (ver comentario extenso
// junto a `escapeAttr`) igual que `variant`/`align`, ya probados. "default"
// = sin override (usa el mismo cálculo de color que ya deriva `weight`, y
// family="body" de siempre).
export type TextBlockColor =
  | "default"
  | "neutral-strong"
  | "neutral-medium"
  | "neutral-weak"
  | "brand-strong"
  | "accent-strong"
  | "danger-strong"
  | "success-strong";
export type TextBlockFamily = "default" | "heading" | "label" | "code";

export type ContentBlock =
  | {
      id: string;
      type: "text";
      html: string;
      align?: TextBlockAlign;
      weight?: TextBlockWeight;
      italic?: boolean;
      color?: TextBlockColor;
      family?: TextBlockFamily;
    }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "carousel"; images: { id: string; url: string; alt: string }[] }
  | { id: string; type: "embed"; language: string; code: string }
  | { id: string; type: "link"; url: string; label: string }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "divider" }
  | { id: string; type: "tag"; label: string; variant: TagVariant; size: TagSize }
  // Chips de categorías predefinidas del dominio (verticales/subcategorías
  // reales de src/lib/projectCategories.ts): multi-select en el editor con
  // `Chip` (interactivo, onClick de Once UI), serializado como fila de `Tag`
  // estáticos al guardar — ver decisión documentada junto a `blockToMarkdown`
  // (case "categoryTags").
  | { id: string; type: "categoryTags"; selected: string[] }
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

// Panel "Añadir sección" (tarea 2, auditoría de herramientas): se retiraron
// Insignia/Categorías/Links/Etiqueta/Estado/Barra de progreso de esta lista
// —su propósito quedó cubierto por la cabecera nueva del visor
// (categoría+subcategorías+software, ver page.tsx) o por el enlace desde
// texto (bloque "link")—, pero sus `type` SIGUEN en `ContentBlock`/
// `createBlock`/el render de `ContentBlockCard` de más abajo intactos: una
// pieza vieja que ya trae uno de esos bloques debe seguir editándose y
// renderizando en el visor exactamente igual. Solo se quitan de esta lista
// (fuente única de los 3 selectores de tipo: panel derecho, "+" del lienzo y
// el picker de arrastre — ver CreateProjectModal.tsx), así que tampoco
// aparecen como opción para arrastrar/instanciar un bloque nuevo.
export const BLOCK_TYPES: { type: ContentBlockType; label: string; icon: string }[] = [
  { type: "image", label: "Imagen", icon: "images" },
  { type: "text", label: "Texto", icon: "document" },
  { type: "carousel", label: "Carousel de fotos", icon: "carousel" },
  { type: "embed", label: "Código", icon: "codeBracket" },
  { type: "video", label: "Video", icon: "film" },
  { type: "divider", label: "Divisor", icon: "divider" },
  { type: "avatarGroup", label: "Colaboradores", icon: "userGroup" },
  { type: "logoCloud", label: "Nube de logos", icon: "grid" },
  { type: "scroller", label: "Tira deslizable", icon: "arrowRight" },
  { type: "masonry", label: "Cuadrícula de fotos", icon: "gallery" },
];

// Mapa COMPLETO de label/icon por tipo (a diferencia de `BLOCK_TYPES`, que
// solo lista lo instanciable desde el panel): la cabecera de
// `ContentBlockCard` (icono + nombre del tipo de bloque) debe seguir
// mostrando algo coherente para los 6 tipos retirados del panel cuando una
// pieza vieja ya los trae — derivar esto de `BLOCK_TYPES` los dejaría con
// `undefined`.
const ALL_BLOCK_META: Record<ContentBlockType, { label: string; icon: string }> = {
  image: { label: "Imagen", icon: "images" },
  text: { label: "Texto", icon: "document" },
  carousel: { label: "Carousel de fotos", icon: "carousel" },
  embed: { label: "Código", icon: "codeBracket" },
  link: { label: "Links", icon: "openLink" },
  video: { label: "Video", icon: "film" },
  divider: { label: "Divisor", icon: "divider" },
  tag: { label: "Etiqueta", icon: "shapes" },
  categoryTags: { label: "Categorías", icon: "briefcase" },
  badge: { label: "Insignia", icon: "sparkles" },
  status: { label: "Estado", icon: "infoCircle" },
  progress: { label: "Barra de progreso", icon: "refreshCw" },
  avatarGroup: { label: "Colaboradores", icon: "userGroup" },
  logoCloud: { label: "Nube de logos", icon: "grid" },
  scroller: { label: "Tira deslizable", icon: "arrowRight" },
  masonry: { label: "Cuadrícula de fotos", icon: "gallery" },
};

const BLOCK_LABEL: Record<ContentBlockType, string> = Object.fromEntries(
  Object.entries(ALL_BLOCK_META).map(([type, meta]) => [type, meta.label]),
) as Record<ContentBlockType, string>;

const BLOCK_ICON: Record<ContentBlockType, string> = Object.fromEntries(
  Object.entries(ALL_BLOCK_META).map(([type, meta]) => [type, meta.icon]),
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
    case "categoryTags":
      return { id: newId(), type, selected: [] };
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
  | {
      type: "heading";
      level: 2 | 3 | 4;
      text: string;
      align?: TextBlockAlign;
      variant?: string;
    };

const HEADING_TAG_LEVEL: Record<string, 2 | 3 | 4> = { H2: 2, H3: 3, H4: 4 };

// Mismo mapeo que `variantMap` de HeadingLink.js (harness Once UI): variant
// tipográfico real por nivel de heading, para que un heading alineado (ruta
// JSX) se vea idéntico en tamaño/peso a uno sin alinear (ruta ATX). También
// sirve como valor "Predeterminado" (sin override) del selector de estilo.
const HEADING_VARIANT: Record<2 | 3 | 4, string> = {
  2: "heading-strong-xl",
  3: "heading-strong-l",
  4: "heading-strong-m",
};

// FEATURE (variantes de encabezado, curaduría ~6-8 opciones): `Heading`
// comparte `TextProps` con `Text` (ver ai/components/Heading.json →
// TextProps.variant: TextVariant), y `TextVariant` es un template literal
// `${TextType}-${TextWeight}-${TextSize}` con TextType = "body"|"heading"|
// "display"|"label"|"code" (ver ai/spec.json) — Heading.js (dist) solo
// parte el string por guiones para armar las clases `font-*`, sin validar
// que el tipo sea "heading": un `variant="body-strong-l"` en un `<Heading
// as="h2">` es 100% válido y renderiza con las mismas clases `font-body
// font-strong font-l` que ya usa cualquier `<Text variant="body-strong-l">`
// del sitio (verificado leyendo Heading.js: getVariantClasses no distingue
// origen). GOTCHA de props con llaves (ver arriba): `variant` es siempre
// string plano, así que sobrevive el pipeline igual que `align` — por eso
// el heading toma la MISMA ruta JSX (`<Heading variant=... />`) que ya usa
// `align`, ampliada para disparar también cuando el usuario elige un estilo
// no-default (ver `blockToMarkdown`, case "text").
const HEADING_VARIANT_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Predeterminado" },
  { value: "display-strong-l", label: "Título grande" },
  { value: "heading-strong-xl", label: "Título" },
  { value: "heading-strong-l", label: "Subtítulo" },
  { value: "heading-strong-m", label: "Encabezado" },
  { value: "heading-default-m", label: "Encabezado ligero" },
  { value: "body-strong-l", label: "Texto destacado" },
  { value: "body-default-l", label: "Texto grande" },
];

const HEADING_VARIANT_VALUES = new Set(
  HEADING_VARIANT_OPTIONS.filter((option) => option.value !== "default").map(
    (option) => option.value,
  ),
);

// FEATURE (color de texto, tarea 4): curaduría corta de `onBackground`
// reales de Once UI (ver ai/spec.json — Colors = `${ColorScheme}-${Color
// Weight}`). Verificado en pantalla contra una pieza publicada de prueba
// que las 7 opciones sobreviven el pipeline completo (mismo prop string que
// ya usa `onBackground="neutral-medium"` en el camino default): editor →
// Markdown guardado → visor público, sin ningún atributo perdido por el
// GOTCHA de props con llaves (`onBackground` siempre viaja como string
// entre comillas, nunca `{...}`).
const TEXT_COLOR_OPTIONS: { value: TextBlockColor; label: string; swatch: string }[] = [
  { value: "default", label: "Predeterminado", swatch: "neutral-medium" },
  { value: "neutral-strong", label: "Neutro fuerte", swatch: "neutral-strong" },
  { value: "neutral-medium", label: "Neutro medio", swatch: "neutral-medium" },
  { value: "neutral-weak", label: "Neutro suave", swatch: "neutral-weak" },
  { value: "brand-strong", label: "Marca", swatch: "brand-strong" },
  { value: "accent-strong", label: "Acento", swatch: "accent-strong" },
  { value: "danger-strong", label: "Peligro", swatch: "danger-strong" },
  { value: "success-strong", label: "Éxito", swatch: "success-strong" },
];

// FEATURE (familia tipográfica, tarea 4): `family` (TextType real: body/
// heading/label/code, ver ai/components/Text.json) es el mismo tipo de prop
// string que `variant`/`onBackground` — sobrevive el pipeline igual.
// "Cuerpo" queda fuera de la lista (es el default "sin override", ya
// cubierto por el valor "default"); DESCARTADO "display" a propósito: un
// párrafo de cuerpo con family="display" se ve desproporcionado (esa
// familia está pensada para tamaños grandes de hero/heading, no body/m) —
// verificado en pantalla, el line-height/tracking de "display" no calza con
// texto corrido.
const TEXT_FAMILY_OPTIONS: { value: TextBlockFamily; label: string }[] = [
  { value: "default", label: "Cuerpo" },
  { value: "heading", label: "Encabezado" },
  { value: "label", label: "Etiqueta" },
  { value: "code", label: "Código" },
];

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
      // `data-variant`: atributo HTML plano (no `style`), mismo criterio que
      // `align` arriba — puesto/quitado por `setHeadingVariant` en
      // RichTextEditor. Solo se respeta si coincide con la curaduría
      // (`HEADING_VARIANT_VALUES`), para no colar un valor arbitrario.
      const rawVariant = (node as Element).getAttribute("data-variant");
      const variant = rawVariant && HEADING_VARIANT_VALUES.has(rawVariant) ? rawVariant : undefined;
      if (text) segments.push({ type: "heading", level, text, align, variant });
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
  color: TextBlockColor,
  family: TextBlockFamily,
): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  // Camino "sin cambios" (todo default): serializa IDÉNTICO a como
  // siempre — no ensucia el Markdown de las piezas que no tocan la
  // barra de estilo del bloque.
  if (
    align === "left" &&
    weight === "default" &&
    !italic &&
    color === "default" &&
    family === "default"
  ) {
    return `<Text variant="body-default-m" onBackground="neutral-medium">\n${trimmed}\n</Text>`;
  }
  // Con cualquier override, `variant` deja de usarse: Text.js (Once UI)
  // IGNORA `size`/`weight` por completo cuando `variant` está presente
  // (ver dist/components/Text.js — `classes = variant ? getVariantClasses(variant)
  // : [sizeClass, weightClass]`), así que `weight="strong"` junto a
  // `variant="body-default-m"` no aplicaría nada. Se reconstruye la
  // misma tipografía body/m con `family`+`size` sueltos para poder
  // sumar `weight`/`align`/`color`/`family` reales.
  // "light" no existe como TextWeight real de Once UI (solo
  // "default"|"strong", ver ai/components/Text.json del harness): se
  // aproxima con `onBackground="neutral-weak"` (color atenuado, prop
  // real) en vez de un peso tipográfico inexistente. El selector de color
  // (tarea 4) es prioritario sobre esa aproximación: si el usuario elige un
  // color explícito, gana sobre el fallback de `weight="light"`.
  const resolvedOnBackground =
    color !== "default" ? color : weight === "light" ? "neutral-weak" : "neutral-medium";
  // `family` (TextType real: body/heading/label/code, ver ai/components/
  // Text.json) — "default" mantiene "body" de siempre.
  const resolvedFamily = family !== "default" ? family : "body";
  const attrs = [
    `family="${resolvedFamily}"`,
    `size="m"`,
    `onBackground="${resolvedOnBackground}"`,
  ];
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
      const color = block.color ?? "default";
      const family = block.family ?? "default";
      const segments = splitTextBlockHtml(html);
      const parts = segments.map((segment) => {
        if (segment.type !== "heading") {
          return serializeTextSegment(segment.html, align, weight, italic, color, family);
        }
        // Ver GOTCHA extenso junto a `TextSegment`/`escapeJsxText`: un heading
        // sin align NI variante propia sigue el camino ATX de siempre (con
        // anchor de copiar link); uno CON align y/o variante se emite como
        // `Heading` real de Once UI para que ambos sobrevivan a la vista
        // pública (ver comentario junto a `HEADING_VARIANT_OPTIONS`).
        if (!segment.align && !segment.variant) {
          return `${"#".repeat(segment.level)} ${segment.text}`;
        }
        const tag = `h${segment.level}` as "h2" | "h3" | "h4";
        const variant = segment.variant ?? HEADING_VARIANT[segment.level];
        const alignAttr = segment.align ? ` align="${segment.align}"` : "";
        return `<Heading as="${tag}" variant="${variant}"${alignAttr} marginTop="24" marginBottom="12">${escapeJsxText(segment.text)}</Heading>`;
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
    case "categoryTags": {
      // DECISIÓN VERIFICADA (Chip vs Tag en el visor publicado): `Chip` (ver
      // node_modules/@once-ui-system/core/ai/components/Chip.json y
      // https://docs.once-ui.com/once-ui/form-controls/chip) es un control
      // interactivo — su selección visual depende de `onClick`
      // (MouseEventHandler, prop con llaves) y de `iconButtonProps`
      // (`Partial<IconButtonProps> = {}`, objeto). ambos se eliminan por el
      // mismo GOTCHA de arriba (blockJS quita cualquier atributo JSX escrito
      // con llaves), y aunque no fuera así el visor publicado (RSC estático,
      // sin cliente para manejar el evento) no tiene ningún handler real que
      // `onClick` pudiera invocar — solo tiene sentido como picker DENTRO de
      // este editor. `selected` (boolean, default `true`) sí sobreviviría
      // como shorthand (mismo truco que `label` de ProgressBar), pero sin
      // `onClick` cada Chip se vería SIEMPRE en su estado "seleccionado"
      // (ver Chip.js: el ícono de check y el borde de selección dependen de
      // ese boolean, no de si hay handler), lo que no comunica nada útil en
      // una lectura pasiva. Se opta por la ruta robusta ya probada en este
      // mismo archivo (mismo patrón que "tag"/"badge"/"scroller"): `Tag`
      // estático (props string, ya registrado tal cual en el mapa de
      // `components` de mdx.tsx) manteniendo la ESTÉTICA de chip/etiqueta en
      // la vista pública, aunque pierda la interactividad de picker (que de
      // cualquier forma no tendría ningún efecto en una pieza ya publicada).
      const selected = block.selected.filter((s) => s.trim());
      if (selected.length === 0) return "";
      const tags = selected
        .map((label) => `  <Tag variant="brand" size="m" label="${escapeAttr(label)}" />`)
        .join("\n");
      // `wrap` (sin `fillWidth`/`fill`) dispara el auto-centrado +
      // `fitWidth` de `createRowElement` en mdx.tsx — mismo mecanismo que ya
      // usa `logoCloud` (ver ese wrapper en mdx.tsx para el detalle).
      return `<Row gap="8" wrap>\n${tags}\n</Row>`;
    }
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
  align: TextBlockAlign;
  weight: TextBlockWeight;
  italic: boolean;
  color: TextBlockColor;
  family: TextBlockFamily;
  onChange: (html: string) => void;
  onAlignChange: (align: TextBlockAlign) => void;
  onWeightChange: (weight: TextBlockWeight) => void;
  onItalicChange: (italic: boolean) => void;
  onColorChange: (color: TextBlockColor) => void;
  onFamilyChange: (family: TextBlockFamily) => void;
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
  color,
  family,
  onChange,
  onAlignChange,
  onWeightChange,
  onItalicChange,
  onColorChange,
  onFamilyChange,
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
  // "default" = sin `data-variant` propio (usa el mapeo fijo por nivel de
  // `HEADING_VARIANT`); solo tiene efecto visible cuando `blockFormat` es
  // h2/h3/h4 (ver `setHeadingVariant`/UI de la toolbar).
  const [paragraphVariant, setParagraphVariant] = useState<string>("default");
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [variantMenuOpen, setVariantMenuOpen] = useState(false);
  // Color/familia (tarea 4): a diferencia de align/variant (por párrafo, ver
  // `paragraphAlign`/`paragraphVariant`), aplican al BLOQUE completo — mismo
  // nivel que `weight`/`italic` (ver `onColorChange`/`onFamilyChange`,
  // controlados por el padre igual que esos dos).
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [familyMenuOpen, setFamilyMenuOpen] = useState(false);

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
    const attrVariant = blockEl?.getAttribute("data-variant");
    setParagraphVariant(attrVariant && HEADING_VARIANT_VALUES.has(attrVariant) ? attrVariant : "default");
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
    // Mismo GOTCHA que `align` (ver comentario arriba): `data-variant` (el
    // selector de estilo de heading) tampoco sobrevive la conversión de
    // `execCommand("formatBlock", ...)` — se reaplica igual que `align`.
    const prevVariant = prevBlock?.getAttribute("data-variant");
    document.execCommand("formatBlock", false, `<${format}>`);
    if (el) {
      const selectionAfter = window.getSelection();
      const newBlock =
        selectionAfter && selectionAfter.rangeCount > 0
          ? getBlockAncestor(selectionAfter.getRangeAt(0).commonAncestorContainer, el)
          : null;
      if (newBlock && prevAlign && !newBlock.getAttribute("align")) {
        newBlock.setAttribute("align", prevAlign);
        setParagraphAlign(prevAlign as TextBlockAlign);
      }
      if (newBlock && prevVariant && !newBlock.getAttribute("data-variant")) {
        newBlock.setAttribute("data-variant", prevVariant);
        setParagraphVariant(prevVariant);
      }
    }
    setBlockFormat(format);
    emit();
  };

  // FEATURE (variantes de encabezado): mismo patrón que
  // `alignCurrentParagraph`, pero sobre `data-variant` en vez de `align` (ver
  // GOTCHA extenso junto a `HEADING_VARIANT_OPTIONS`). Solo tiene efecto real
  // cuando el bloque del cursor es h2/h3/h4 — la UI ya deshabilita este
  // control cuando `blockFormat === "p"`.
  const setHeadingVariant = (value: string) => {
    focusEditor();
    const el = ref.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0) return;
    const blockEl = getBlockAncestor(selection.getRangeAt(0).commonAncestorContainer, el);
    if (!blockEl) return;
    if (value === "default") blockEl.removeAttribute("data-variant");
    else blockEl.setAttribute("data-variant", value);
    setParagraphVariant(value);
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
        {/* Estilo del encabezado (tarea Heading variants): solo tiene efecto
            visible sobre h2/h3/h4 (ver `setHeadingVariant`), deshabilitado
            para "Cuerpo" — un párrafo normal ya usa `serializeTextSegment`
            (align/weight/italic del bloque completo), no este mecanismo por
            párrafo. */}
        <DropdownWrapper
          isOpen={variantMenuOpen}
          onOpenChange={setVariantMenuOpen}
          placement="bottom-start"
          trigger={
            <IconButton
              icon="sparkles"
              tooltip={`Estilo de encabezado: ${
                HEADING_VARIANT_OPTIONS.find((option) => option.value === paragraphVariant)
                  ?.label ?? "Predeterminado"
              }`}
              variant={paragraphVariant !== "default" ? "primary" : "tertiary"}
              size="s"
              disabled={disabled || blockFormat === "p"}
            />
          }
          dropdown={
            <Column minWidth={12} padding="4" gap="2">
              {HEADING_VARIANT_OPTIONS.map((option) => (
                <Option
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  selected={paragraphVariant === option.value}
                  onClick={() => {
                    setHeadingVariant(option.value);
                    setVariantMenuOpen(false);
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
        {/* Color de texto (tarea 4): aplica a TODO el bloque, mismo nivel
            que `weight`/`italic` (ver `onColorChange`). El swatch del
            trigger se tiñe con `color` (prop real de `IconButton`, ver
            ai/components/IconButton.json) para previsualizar la selección
            actual sin abrir el dropdown. */}
        <DropdownWrapper
          isOpen={colorMenuOpen}
          onOpenChange={setColorMenuOpen}
          placement="bottom-start"
          trigger={
            <IconButton
              icon="paintBrush"
              tooltip={`Color de texto: ${
                TEXT_COLOR_OPTIONS.find((option) => option.value === color)?.label ??
                "Predeterminado"
              }`}
              variant={color !== "default" ? "primary" : "tertiary"}
              color={color !== "default" ? color : undefined}
              size="s"
              disabled={disabled}
            />
          }
          dropdown={
            <Column minWidth={11} padding="4" gap="2">
              {TEXT_COLOR_OPTIONS.map((option) => (
                <Option
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  selected={color === option.value}
                  onClick={() => {
                    onColorChange(option.value);
                    setColorMenuOpen(false);
                  }}
                />
              ))}
            </Column>
          }
        />
        {/* Familia tipográfica (tarea 4): `family` real de Once UI (body/
            heading/label/code), mismo nivel de bloque que color/weight. */}
        <DropdownWrapper
          isOpen={familyMenuOpen}
          onOpenChange={setFamilyMenuOpen}
          placement="bottom-start"
          trigger={
            <IconButton
              tooltip={`Familia tipográfica: ${
                TEXT_FAMILY_OPTIONS.find((option) => option.value === family)?.label ?? "Cuerpo"
              }`}
              variant={family !== "default" ? "primary" : "tertiary"}
              size="s"
              disabled={disabled}
            >
              <Text variant="label-strong-s">Aa</Text>
            </IconButton>
          }
          dropdown={
            <Column minWidth={10} padding="4" gap="2">
              {TEXT_FAMILY_OPTIONS.map((option) => (
                <Option
                  key={option.value}
                  label={option.label}
                  value={option.value}
                  selected={family === option.value}
                  onClick={() => {
                    onFamilyChange(option.value);
                    setFamilyMenuOpen(false);
                  }}
                />
              ))}
            </Column>
          }
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

  // El bloque "divisor" (tarea 7, auditoría de herramientas) es el único
  // sin nada que colapsar (una sola línea, sin campos de edición): se le
  // quita el chevron de colapso y se le da un fondo de contraste
  // (`neutral-alpha-weak`, recurso nativo del sistema) para diferenciarlo
  // del resto de las tarjetas de bloque (`background="page"`).
  const isDivider = block.type === "divider";

  return (
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="m"
      border="neutral-alpha-weak"
      background={isDivider ? "neutral-alpha-weak" : "page"}
      opacity={isDragging ? 50 : 100}
    >
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="4" vertical="center">
          {!isDivider && (
            <IconButton
              icon={collapsed ? "chevronRight" : "chevronDown"}
              variant="tertiary"
              size="s"
              tooltip={collapsed ? "Expandir sección" : "Colapsar sección"}
              onClick={() => setCollapsed((current) => !current)}
              disabled={disabled}
            />
          )}
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
          align={block.align ?? "left"}
          weight={block.weight ?? "default"}
          italic={block.italic ?? false}
          color={block.color ?? "default"}
          family={block.family ?? "default"}
          onChange={(next) => onChange({ ...block, html: next })}
          onAlignChange={(align) => onChange({ ...block, align })}
          onWeightChange={(weight) => onChange({ ...block, weight })}
          onItalicChange={(italic) => onChange({ ...block, italic })}
          onColorChange={(color) => onChange({ ...block, color })}
          onFamilyChange={(family) => onChange({ ...block, family })}
          disabled={disabled}
        />
      )}

      {!collapsed && block.type === "image" && (
        // El input de "Texto alternativo" se retiró del editor (tarea 3,
        // auditoría de herramientas): no se visualiza en el render final
        // (createImage en mdx.tsx pasa `alt` al <Media>, pero Once UI no lo
        // muestra en pantalla — solo lo usa el navegador/lectores de
        // pantalla). `block.alt` sigue existiendo en el tipo/estado y
        // blockToMarkdown lo sigue serializando tal cual (ver case "image"),
        // así que una pieza vieja con alt ya escrito no lo pierde; los
        // bloques nuevos simplemente serializan con "" (default de
        // `createBlock`).
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
        </Column>
      )}

      {!collapsed && block.type === "carousel" && (
        // Rediseño compacto (tarea 5, auditoría de herramientas): el
        // `Carousel` de preview a tamaño completo (con un slide-tile
        // gigante de `MediaUpload` al final, no interactivo hasta hacer
        // click dentro del carrusel) se sustituye por el MISMO patrón ya
        // funcional de logoCloud/masonry — fila de tiles pequeños (72px,
        // `width`/`height` numéricos = rem reales, ver `parseDimension` en
        // el harness: 4.5 → "4.5rem" = 72px) con `MediaUpload` real
        // (mecanismo de subida ya probado) + botón de basura por imagen, y
        // un tile "+" al final. El render del visor (Scroller de `Media`,
        // ver blockToMarkdown case "carousel") no cambia.
        <Row gap="8" wrap>
          {block.images.map((image) => (
            <Column key={image.id} gap="4" width={4.5}>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                initialPreviewImage={image.url || null}
                emptyState=""
                radius="m"
                onFileUpload={async (file) => {
                  const url = await readFileAsDataUrl(file);
                  onChange({
                    ...block,
                    images: block.images.map((i) => (i.id === image.id ? { ...i, url } : i)),
                  });
                }}
              />
              <IconButton
                icon="trash"
                variant="tertiary"
                size="s"
                tooltip="Quitar imagen"
                disabled={disabled}
                onClick={() =>
                  onChange({ ...block, images: block.images.filter((i) => i.id !== image.id) })
                }
              />
            </Column>
          ))}
          {/* Ver GOTCHA junto al tile "Agregar" de avatarGroup/logoCloud/
              masonry: `key` atado a la longitud del array fuerza un remount
              limpio del MediaUpload en cada add/remove (evita el bug de
              reconciliación de React por posición). */}
          <Column key={`add-${block.images.length}`} width={4.5}>
            <MediaUpload
              aspectRatio="1"
              accept="image/*"
              compress
              resizeMaxWidth={1600}
              resizeMaxHeight={1600}
              emptyState="Agregar"
              radius="m"
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
      )}

      {!collapsed && block.type === "embed" && (
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
        <Row fillWidth vertical="center">
          <Line background="neutral-alpha-medium" fillWidth />
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

      {!collapsed && block.type === "categoryTags" && (
        <Column gap="16">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            Selecciona las categorías del proyecto. Se guardan como etiquetas estáticas en la
            pieza publicada.
          </Text>
          {PROJECT_VERTICALS.map((vertical) => (
            <Column key={vertical} gap="8">
              <Text variant="label-strong-s" onBackground="neutral-weak">
                {vertical}
              </Text>
              <Row gap="8" wrap>
                {PROJECT_SUBCATEGORIES[vertical].map((subcategory) => {
                  const isSelected = block.selected.includes(subcategory);
                  return (
                    <Chip
                      key={subcategory}
                      label={subcategory}
                      selected={isSelected}
                      // `Chip` (ver ai/components/Chip.json) no expone un prop
                      // `disabled` propio: se emula quitando el handler.
                      onClick={
                        disabled
                          ? undefined
                          : () =>
                              onChange({
                                ...block,
                                selected: isSelected
                                  ? block.selected.filter((s) => s !== subcategory)
                                  : [...block.selected, subcategory],
                              })
                      }
                    />
                  );
                })}
              </Row>
            </Column>
          ))}
          {block.selected.length > 0 && (
            <Row gap="8" wrap>
              {block.selected.map((label) => (
                <Tag key={label} variant="brand" size="m" label={label} />
              ))}
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
          {/* Solo miniaturas (tarea 6, auditoría de herramientas): mismo
              patrón compacto del carrusel (ver bloque "carousel" arriba) —
              tiles de 96px (`width`/`height` numéricos = rem reales, 6 →
              "6rem" = 96px) en vez de las previews grandes de antes; sin
              input de alt suelto por imagen, mismo criterio que el
              carrusel. El render del visor (`MasonryGrid` real, ver
              blockToMarkdown case "masonry") no cambia. */}
          <Row gap="8" wrap>
            {block.images.map((image) => (
              <Column key={image.id} gap="4" width={6}>
                <MediaUpload
                  aspectRatio="1"
                  accept="image/*"
                  compress
                  resizeMaxWidth={1600}
                  resizeMaxHeight={1600}
                  initialPreviewImage={image.url || null}
                  emptyState="Foto"
                  radius="m"
                  onFileUpload={async (file) => {
                    const url = await readFileAsDataUrl(file);
                    onChange({
                      ...block,
                      images: block.images.map((i) => (i.id === image.id ? { ...i, url } : i)),
                    });
                  }}
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
            <Column key={`add-${block.images.length}`} width={6}>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                emptyState="Agregar"
                radius="m"
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
