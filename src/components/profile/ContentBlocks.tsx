"use client";

import {
  Carousel,
  Column,
  CompareImage,
  EmojiPickerDropdown,
  Feedback,
  Icon,
  IconButton,
  Input,
  Line,
  Row,
  Select,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useEffect, useRef } from "react";
import { readFileAsDataUrl } from "@/lib/files";

// El Canvas no edita un .md crudo: el usuario arma bloques estructurados y
// estos se serializan a Markdown/MDX (texto plano) tras bambalinas al
// guardar. El visualizador de proyectos (src/components/mdx.tsx) resuelve
// ese texto con el mismo sistema de componentes Once UI, así que los
// bloques que generan JSX (Carousel, CompareImage) deben tener su
// contraparte registrada ahí.
export type ContentBlock =
  | { id: string; type: "text"; html: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "carousel"; images: { id: string; url: string; alt: string }[] }
  | { id: string; type: "compare"; beforeUrl: string; afterUrl: string }
  | { id: string; type: "embed"; language: string; code: string }
  | { id: string; type: "link"; url: string; label: string }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "divider" };

export type ContentBlockType = ContentBlock["type"];

export const BLOCK_TYPES: { type: ContentBlockType; label: string; icon: string }[] = [
  { type: "image", label: "Imagen", icon: "images" },
  { type: "text", label: "Texto", icon: "document" },
  { type: "carousel", label: "Carousel de fotos", icon: "carousel" },
  { type: "compare", label: "Comparador", icon: "compare" },
  { type: "embed", label: "Incrustar", icon: "codeBracket" },
  { type: "link", label: "Links", icon: "openLink" },
  { type: "video", label: "Video", icon: "film" },
  { type: "divider", label: "Divisor", icon: "divider" },
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

export function createBlock(type: ContentBlockType): ContentBlock {
  switch (type) {
    case "text":
      return { id: newId(), type, html: "" };
    case "image":
      return { id: newId(), type, url: "", alt: "" };
    case "carousel":
      return { id: newId(), type, images: [] };
    case "compare":
      return { id: newId(), type, beforeUrl: "", afterUrl: "" };
    case "embed":
      return { id: newId(), type, language: "", code: "" };
    case "link":
      return { id: newId(), type, url: "", label: "" };
    case "video":
      return { id: newId(), type, url: "" };
    case "divider":
      return { id: newId(), type };
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
      const items = images
        .map((i) => `    { slide: ${JSON.stringify(i.url)}, alt: ${JSON.stringify(i.alt)} }`)
        .join(",\n");
      return `<Carousel indicator="thumbnail" aspectRatio="4 / 3" items={[\n${items},\n  ]} />`;
    }
    case "compare": {
      if (!block.beforeUrl || !block.afterUrl) return "";
      // No se usa <CompareImage>: verificado en pantalla que dentro de
      // next-mdx-remote/rsc no muestra ninguna de las dos imágenes sin
      // importar la forma de leftContent/rightContent (string plano,
      // objeto {src,alt} o <Media/> como expresión) —esta última incluso
      // truena en runtime ("Cannot read properties of undefined (reading
      // 'src')")—, aunque el objeto sí funciona en la vista previa del
      // editor (TSX puro, sin pasar por el compilador de MDX). Se
      // reemplaza por un side-by-side con Media, que sí renderiza.
      const escapeAttr = (url: string) => url.replace(/"/g, "%22");
      return [
        `<Row gap="16" fillWidth>`,
        `  <Column flex={1} gap="8">`,
        `    <Text variant="label-strong-s" onBackground="neutral-weak">Antes</Text>`,
        `    <Media src="${escapeAttr(block.beforeUrl)}" alt="Antes" aspectRatio="4 / 3" radius="m" />`,
        `  </Column>`,
        `  <Column flex={1} gap="8">`,
        `    <Text variant="label-strong-s" onBackground="neutral-weak">Después</Text>`,
        `    <Media src="${escapeAttr(block.afterUrl)}" alt="Después" aspectRatio="4 / 3" radius="m" />`,
        `  </Column>`,
        `</Row>`,
      ].join("\n");
    }
    case "embed":
      return block.code.trim() ? `\`\`\`${block.language}\n${block.code}\n\`\`\`` : "";
    case "link":
      return block.url ? `[${block.label || block.url}](${block.url})` : "";
    case "video": {
      const youtubeId = extractYouTubeId(block.url);
      if (!youtubeId) return "";
      const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
      return `<iframe width="100%" style={{ aspectRatio: "16 / 9", border: 0 }} src={${JSON.stringify(embedUrl)}} title="Video de YouTube" allowFullScreen></iframe>`;
    }
    case "divider":
      return "---";
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
          onChange={(next) => onChange({ ...block, html: next })}
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

      {block.type === "compare" && (
        <Column gap="12">
          <Row fillWidth gap="12">
            <Column fillWidth gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Antes
              </Text>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                initialPreviewImage={block.beforeUrl || null}
                emptyState="Antes"
                onFileUpload={async (file) =>
                  onChange({ ...block, beforeUrl: await readFileAsDataUrl(file) })
                }
              />
            </Column>
            <Column fillWidth gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Después
              </Text>
              <MediaUpload
                aspectRatio="1"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                initialPreviewImage={block.afterUrl || null}
                emptyState="Después"
                onFileUpload={async (file) =>
                  onChange({ ...block, afterUrl: await readFileAsDataUrl(file) })
                }
              />
            </Column>
          </Row>
          {block.beforeUrl && block.afterUrl && (
            <CompareImage
              aspectRatio="16 / 9"
              leftContent={{ src: block.beforeUrl, alt: "Antes" }}
              rightContent={{ src: block.afterUrl, alt: "Después" }}
            />
          )}
        </Column>
      )}

      {block.type === "embed" && (
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
    </Column>
  );
}
