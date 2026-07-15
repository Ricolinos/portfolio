"use client";

import {
  Button,
  Card,
  Chip,
  Column,
  DateInput,
  Dialog,
  DropdownWrapper,
  Feedback,
  Grid,
  Icon,
  IconButton,
  Input,
  Line,
  Media,
  Option,
  RevealFx,
  Row,
  ScrollLock,
  SegmentedControl,
  ShineFx,
  Spinner,
  TagInput,
  Text,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useRouter } from "next/navigation";
import {
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
import {
  createPortfolioPiece,
  getPortfolioPieceForEdit,
  getSubcategorySuggestions,
  updatePortfolioPiece,
} from "@/app/actions/portfolioPieces";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import {
  coverKindOf,
  isPlayableVideoUrl,
  isVideoDataUrl,
  resolveCoverSrc,
  toVideoCoverUrl,
} from "@/lib/coverMedia";
import { readFileAsDataUrl } from "@/lib/files";
import { PIECE_CATEGORIES } from "@/lib/pieceCategories";
import { AttachFilesModal, type AttachmentKind, type ProjectAttachment } from "./AttachFilesModal";
import {
  BLOCK_TYPES,
  blocksToMarkdown,
  type ContentBlock,
  ContentBlockCard,
  type ContentBlockType,
  createBlock,
} from "./ContentBlocks";
import styles from "./CreateProjectModal.module.scss";
import { VideoFileDropzone } from "./VideoFileDropzone";

const modalBackdrop = <BrandModalBackdrop />;

// El editor necesita mucho más espacio del que el <Modal> de Once UI permite
// (viene con maxWidth fijo en 52rem/832px, sin prop para cambiarlo). WideDialog
// replica su mismo shell —overlay, blur, portal, escape, click-outside— con
// un maxWidth configurable, usando exclusivamente átomos de Once UI.
// 108rem cubre con margen: 8 (padding externo) + 40*2 (padding interno "l") +
// 67.5 lienzo + 2 (gap) + 25 panel = ~100.5rem; sin el margen el panel se
// recortaba contra el borde derecho del diálogo.
const DIALOG_MAX_WIDTH = 108; // rem (1728px)
// El panel de herramientas debe quedarse entre 20% y 30% del ancho útil (el
// Canvas, complemento, entre 70% y 80%). Se probó el SplitView de Once UI
// (1.7.12, la última publicada) con defaultSplit/minSplit/maxSplit en estos
// mismos valores y, verificado en pantalla, ignora las props: siempre
// arranca en ~30% para el PRIMER panel (leftPanel/Canvas), invirtiendo la
// proporción (lienzo 33%, panel 67%). Por eso el divisor arrastrable de
// abajo (ResizableSplit) es propio, no el componente de la librería.
const SPLIT_DEFAULT = 0.75;
const SPLIT_MIN = 0.7;
const SPLIT_MAX = 0.8;
// Mismos topes que valida el server (ver MAX_SUBCATEGORIES/MAX_SOFTWARE en
// actions/portfolioPieces.ts): se replican aquí solo para el feedback
// inmediato del contador ("3/10"), la validación real vive del lado server.
const MAX_SUBCATEGORIES = 10;
const MAX_SOFTWARE = 15;
const SUBCATEGORY_SUGGESTION_LIMIT = 8;

// Sin bucket de Storage, la portada viaja como data URL dentro del body de
// la server action: 10MB es el límite configurado en next.config.mjs para
// desarrollo, pero Vercel capa las funciones serverless a ~4.5MB en
// producción. Un GIF sin recomprimir (ver comentario de `coverKind` más
// abajo) puede pesar varios MB fácilmente — este umbral es solo un AVISO no
// bloqueante para que el usuario sepa que puede fallar al publicar.
const GIF_SIZE_WARNING_BYTES = 3 * 1024 * 1024;

type CoverKind = "image" | "gif" | "video";

const COVER_KIND_OPTIONS: { value: CoverKind; label: string; prefixIcon: "gallery" | "sparkles" | "video" }[] = [
  { value: "image", label: "Imagen", prefixIcon: "gallery" },
  { value: "gif", label: "GIF animado", prefixIcon: "sparkles" },
  { value: "video", label: "Video", prefixIcon: "video" },
];

// FEATURE FUTURA (oculta a pedido, sin borrar código): el panel/botón
// "Adjuntar archivo" del panel de herramientas se gatea con esta constante
// en vez de eliminarse — `AttachFilesModal`/`isAttachOpen` siguen montados
// tal cual (el modal nunca se abre porque el único trigger que llama
// `setAttachOpen(true)` queda oculto), listos para reactivarse cambiando
// este valor a `true`.
const ATTACH_FILES_ENABLED = false;

// gallery solo guarda URLs (sin bucket de Storage, ver AttachFilesModal): al
// recargar una pieza para editarla, el tipo de adjunto se infiere del prefijo
// de la data URL, y el nombre original no sobrevive al guardado.
function inferAttachmentKind(url: string): AttachmentKind {
  if (url.startsWith("data:audio/")) return "audio";
  if (url.startsWith("data:video/")) return "video";
  return "image";
}

function hasForeignDialogOpen(ownDialog: HTMLElement | null): boolean {
  if (!ownDialog) return false;
  // Un modal/diálogo anidado (AttachFilesModal, la confirmación de cierre)
  // se porta a document.body como hermano del nuestro: si existe alguno que
  // no contenga nuestro panel, un click o Escape dentro de él no debe
  // interpretarse como "afuera" de este diálogo.
  return Array.from(document.querySelectorAll('[role="dialog"]')).some(
    (el) => !el.contains(ownDialog),
  );
}

interface WideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function WideDialog({ isOpen, onClose, children }: WideDialogProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const timeout = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (hasForeignDialogOpen(dialogRef.current)) return;
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // El Select (y otros dropdowns Once UI) se portan a document.body con
      // clase "dropdown-portal": sin esta excepción, elegir una opción cierra
      // el diálogo antes de que el onSelect llegue a procesarse.
      if (target.closest(".dropdown-portal")) return;
      const nearestDialog = target.closest('[role="dialog"]');
      // El click cayó dentro de OTRO diálogo (anidado) que no es el nuestro.
      if (nearestDialog && !nearestDialog.contains(dialogRef.current)) return;
      if (dialogRef.current && !dialogRef.current.contains(target)) onClose();
    };
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, { capture: true });
    }, 10);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, { capture: true });
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && contentRef.current) contentRef.current.scrollTop = 0;
  }, [isOpen, children]);

  if (!mounted) return null;

  return ReactDOM.createPortal(
    <>
      <ScrollLock enabled={isOpen} allowScrollInElement={contentRef} />
      <Row
        fill
        horizontal="center"
        paddingX="l"
        paddingTop="xl"
        position="fixed"
        background="overlay"
        // 9, no 10: mismo ajuste que Header.tsx — el dropdown-portal de Select
        // (Once UI, hardcoded a zIndex 9) pinta encima por ser posterior en el
        // DOM; con 10 el diálogo tapaba sus propias opciones de Select.
        zIndex={9}
        style={{
          backdropFilter: "blur(0.5rem)",
          opacity: visible ? 1 : 0,
          transition: "opacity 300ms ease",
          inset: 0,
        }}
        role="dialog"
        aria-modal="true"
      >
        {modalBackdrop}
        <Column
          ref={dialogRef}
          maxWidth={DIALOG_MAX_WIDTH}
          fillHeight
          background="page"
          topRadius="xl"
          paddingX="8"
          borderX
          borderTop
          style={{
            transform: visible ? "translateY(0)" : "translateY(4rem)",
            transition: "transform 600ms ease",
          }}
        >
          {/* Sin overflowY aquí: antes este contenedor Y cada panel interno
              scrolleaban por separado, y la altura fija del Row (44rem) no
              coincidía con el alto real del diálogo, cortando las últimas
              tarjetas del panel a la mitad. Ahora este nivel solo reparte
              alto (título fijo + split flex:1) y cada panel hace su propio
              scroll dentro de su caja exacta. */}
          <Column ref={contentRef} fill overflow="hidden" padding="l" tabIndex={-1}>
            <Row position="absolute" right="0" top="0" paddingTop="l" paddingRight="l" zIndex={2}>
              <IconButton
                icon="close"
                onClick={onClose}
                tooltip="Cerrar"
                tooltipPosition="left"
                variant="secondary"
              />
            </Row>
            {children}
          </Column>
        </Column>
      </Row>
    </>,
    document.body,
  );
}

interface ResizableSplitProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  defaultSplit: number;
  minSplit: number;
  maxSplit: number;
}

// Divisor arrastrable propio: reemplaza al SplitView de Once UI, que en la
// versión instalada (1.7.12, la más reciente en npm) ignora defaultSplit/
// minSplit/maxSplit y arranca fijo en ~30% para el primer panel (ver nota
// en SPLIT_DEFAULT). El split se guarda como fracción (0-1) del ancho del
// leftPanel, igual que la API que reemplaza.
function ResizableSplit({
  leftPanel,
  rightPanel,
  defaultSplit,
  minSplit,
  maxSplit,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [split, setSplit] = useState(defaultSplit);
  // Debajo del breakpoint "s" (905px) el split de ancho fijo deja el panel
  // lateral ilegible (~100px con el Canvas apretado al lado); se apilan las
  // dos columnas a ancho completo y se oculta el divisor arrastrable.
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 904px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      setSplit(Math.min(maxSplit, Math.max(minSplit, ratio)));
    };
    const stopDragging = () => {
      draggingRef.current = false;
      document.body.style.removeProperty("cursor");
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [minSplit, maxSplit]);

  const step = 0.02;

  if (isMobile) {
    return (
      <Column fillWidth gap="16" flex={1} overflowY="auto" style={{ minHeight: 0 }}>
        {leftPanel}
        {rightPanel}
      </Column>
    );
  }

  return (
    <Row ref={containerRef} fillWidth flex={1} style={{ minHeight: 0 }}>
      <Column
        fillHeight
        overflowY="auto"
        paddingRight="16"
        style={{ width: `${split * 100}%`, minWidth: 0 }}
      >
        {leftPanel}
      </Column>
      <Row
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(split * 100)}
        aria-valuemin={Math.round(minSplit * 100)}
        aria-valuemax={Math.round(maxSplit * 100)}
        tabIndex={0}
        horizontal="center"
        fillHeight
        style={{ width: "1rem", cursor: "col-resize", touchAction: "none", flexShrink: 0 }}
        onPointerDown={(e) => {
          e.preventDefault();
          draggingRef.current = true;
          document.body.style.cursor = "col-resize";
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSplit((s) => Math.max(minSplit, s - step));
          if (e.key === "ArrowRight") setSplit((s) => Math.min(maxSplit, s + step));
        }}
      >
        <Line background="neutral-alpha-medium" style={{ width: "0.0625rem", height: "100%" }} />
      </Row>
      <Column fillHeight overflowY="auto" paddingLeft="16" flex={1} style={{ minWidth: 0 }}>
        {rightPanel}
      </Column>
    </Row>
  );
}

interface BlockTypePickerProps {
  disabled: boolean;
  onSelect: (type: ContentBlockType) => void;
}

// Segundo acceso a los 15 tipos de bloque (el primero es el panel derecho
// "Añadir sección"): un "+" al fondo del lienzo que abre este popover anclado
// con los mismos tipos como íconos 1:1. El dropdown-portal de DropdownWrapper
// ya cae en la excepción de click-outside del WideDialog (clase
// ".dropdown-portal", ver arriba), así que elegir un tipo no cierra el modal.
function BlockTypePicker({ disabled, onSelect }: BlockTypePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownWrapper
      isOpen={open}
      onOpenChange={setOpen}
      placement="top"
      trigger={
        <IconButton
          icon="plus"
          variant="secondary"
          size="l"
          tooltip="Añadir sección"
          disabled={disabled}
        />
      }
      dropdown={
        <Grid columns={5} gap="8" padding="8">
          {BLOCK_TYPES.map(({ type, label, icon }) => (
            <IconButton
              key={type}
              size="l"
              variant="secondary"
              tooltip={label}
              disabled={disabled}
              onClick={() => {
                onSelect(type);
                setOpen(false);
              }}
            >
              {type === "text" ? (
                <Text variant="heading-strong-s" onBackground="neutral-weak">
                  T
                </Text>
              ) : (
                <Icon name={icon} size="s" onBackground="neutral-weak" />
              )}
            </IconButton>
          ))}
        </Grid>
      }
    />
  );
}

interface CategoryDropdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

// Selección OBLIGATORIA de una de las 9 categorías de src/lib/pieceCategories.ts
// (ver PIECE_CATEGORIES): reemplaza el input libre de texto que tenía antes.
// `DropdownWrapper` + `Option` es el mismo patrón que ya usa CategoryDropdown
// de ExploreSearchBar.tsx, adaptado a un trigger con look de campo de
// formulario (no un link de navegación) porque aquí selecciona un VALOR de
// estado, no navega a una ruta.
function CategoryDropdownField({ value, onChange, disabled, error }: CategoryDropdownFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Column fillWidth gap="4">
      <DropdownWrapper
        fillWidth
        isOpen={open}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
        }}
        trigger={
          <Row
            fillWidth
            horizontal="between"
            vertical="center"
            radius="l"
            border={error ? "danger-medium" : "neutral-medium"}
            background="neutral-alpha-weak"
            paddingX="16"
            paddingY="12"
            gap="8"
            cursor={disabled ? undefined : "interactive"}
            opacity={disabled ? 50 : 100}
          >
            <Column gap="2">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Categoría
              </Text>
              <Text
                variant="body-default-m"
                onBackground={value ? "neutral-strong" : "neutral-weak"}
              >
                {value || "Selecciona una categoría"}
              </Text>
            </Column>
            <Icon name="chevronDown" size="s" onBackground="neutral-weak" />
          </Row>
        }
        dropdown={
          <Column minWidth={12} padding="4" gap="2">
            {PIECE_CATEGORIES.map((option) => (
              <Option
                key={option}
                label={option}
                value={option}
                selected={value === option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              />
            ))}
          </Column>
        }
      />
      {error && (
        <Row paddingX="16">
          <Text variant="body-default-s" onBackground="danger-weak">
            Selecciona una categoría para publicar
          </Text>
        </Row>
      )}
    </Column>
  );
}

interface SubcategoryInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  error?: boolean;
}

// Subcategorías libres con autocompletado (getSubcategorySuggestions, server
// action): mismo patrón de "comma/Enter crea tag" que TagInput (ver
// dist/components/TagInput.js), compuesto a mano porque TagInput no soporta
// sugerencias — igual que CollaboratorSearch en ContentBlocks.tsx (debounce +
// popover normal-flow bajo el input, sin position:absolute, mismo criterio
// probado ahí).
function SubcategoryInput({ value, onChange, disabled, error }: SubcategoryInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const atMax = value.length >= MAX_SUBCATEGORIES;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      getSubcategorySuggestions(inputValue.trim(), SUBCATEGORY_SUGGESTION_LIMIT)
        .then((results) =>
          setSuggestions(
            results.filter(
              (result) => !value.some((tag) => tag.toLowerCase() === result.toLowerCase()),
            ),
          ),
        )
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [inputValue, open, value]);

  const addTag = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || atMax) {
      setInputValue("");
      return;
    }
    if (value.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    onChange([...value, trimmed]);
    setInputValue("");
    setSuggestions([]);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <Column fillWidth gap="4">
      <Input
        id="project-subcategories"
        label="Subcategorías"
        placeholder="Escribe y presiona coma (,) para agregar"
        description={
          value.length === 0
            ? `0/${MAX_SUBCATEGORIES} subcategorías — mínimo 1 para publicar`
            : `${value.length}/${MAX_SUBCATEGORIES} subcategorías`
        }
        error={error}
        // GOTCHA verificado en dist/components/Input.js: el borde rojo de
        // `error` solo se activa cuando `props.value !== ""` (pensado para
        // errores de validación EN VIVO mientras se escribe, no para "campo
        // obligatorio vacío"), y el texto de `description` nunca cambia de
        // color. `errorMessage` sí pinta su propia línea en rojo
        // (danger-weak) SIN esa condición de valor no-vacío — es el único
        // canal que sobrevive para avisar "0 subcategorías" en rojo.
        errorMessage={error ? "Agrega al menos una subcategoría antes de publicar." : undefined}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        disabled={disabled || atMax}
      >
        {value.length > 0 && (
          <Row
            gap="4"
            vertical="center"
            wrap
            paddingY="16"
            style={{ margin: "calc(-1 * var(--static-space-8)) var(--static-space-8)" }}
          >
            {value.map((tag, index) => (
              <Chip
                key={tag}
                label={tag}
                onRemove={disabled ? undefined : () => removeTag(index)}
                iconButtonProps={{ tooltip: `Quitar ${tag}` }}
              />
            ))}
          </Row>
        )}
      </Input>
      {open && !disabled && (loading || suggestions.length > 0) && (
        <Column
          fillWidth
          gap="2"
          radius="m"
          border="neutral-alpha-weak"
          padding="4"
          background="page"
          shadow="l"
          style={{ maxHeight: "12rem", overflowY: "auto" }}
        >
          {loading && (
            <Row fillWidth horizontal="center" padding="8">
              <Spinner size="s" ariaLabel="Buscando subcategorías" />
            </Row>
          )}
          {!loading &&
            suggestions.map((suggestion) => (
              <Row
                key={suggestion}
                fillWidth
                padding="8"
                radius="s"
                cursor="interactive"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addTag(suggestion)}
              >
                <Text variant="label-default-s" onBackground="neutral-strong">
                  {suggestion}
                </Text>
              </Row>
            ))}
        </Column>
      )}
    </Column>
  );
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Presente → modo edición: precarga la pieza y guarda con updatePortfolioPiece
  // en vez de crear una nueva.
  pieceId?: string | null;
}

export function CreateProjectModal({ isOpen, onClose, pieceId = null }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [titleFocused, setTitleFocused] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [software, setSoftware] = useState<string[]>([]);
  const [coverKind, setCoverKind] = useState<CoverKind>("image");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverSizeWarning, setCoverSizeWarning] = useState<string | null>(null);
  // Portada tipo "video": la URL SIN el prefijo "video:" (ver lib/coverMedia)
  // — el prefijo se agrega recién al guardar (handleSave), así el input del
  // usuario es la URL real y no un valor con prefijo confuso.
  const [videoUrl, setVideoUrl] = useState("");
  // Colapso puramente de UI (mismo criterio que ContentBlockCard): la
  // portada sigue siendo obligatoria, esto solo minimiza su sección en el
  // lienzo cuando ya se subió la imagen.
  const [coverCollapsed, setCoverCollapsed] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  // LEGACY: ya no se edita desde este panel (ver "Software implementado"),
  // pero se conserva el valor precargado y se reenvía tal cual al guardar —
  // omitirlo del payload haría que el server lo pisara con `[]` en cada
  // guardado (ver `tags: (input.tags ?? []).slice(...)` en
  // actions/portfolioPieces.ts) y borraría las etiquetas legacy de piezas
  // viejas sin que el usuario lo pidiera.
  const [tags, setTags] = useState<string[]>([]);
  // Ya no se edita desde este panel (ver bloque "Colaboradores" del Canvas):
  // solo llega precargado en modo edición y se combina en `handleSave` con
  // los usernames del bloque avatarGroup (mergedCollaborators).
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [isAttachOpen, setAttachOpen] = useState(false);
  const [isConfirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPiece, setLoadingPiece] = useState(false);
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const disabled = saving !== null || loadingPiece;
  // Se enciende con CUALQUIER cambio de portada/bloques/título/campos (ver
  // efecto de tracking más abajo) y se apaga tras un guardado exitoso o al
  // (re)cargar la pieza — gatea el Dialog de confirmación al intentar cerrar.
  const [isDirty, setIsDirty] = useState(false);
  // Arma el "skip" de UNA sola corrida del efecto de tracking: se enciende
  // justo antes de precargar/resetear (los setState de esa carga SÍ disparan
  // el efecto, pero no deben contar como "cambio sin guardar" del usuario).
  const skipDirtyRef = useRef(true);
  // Si la pieza YA era pública al abrir el editor, "Guardar en borrador"
  // desde el Dialog de confirmación la despublica — se avisa en el copy del
  // botón (ver Dialog más abajo) usando este flag.
  const [originalIsPublic, setOriginalIsPublic] = useState(false);
  // Se enciende al intentar PUBLICAR con categoría/subcategorías faltantes,
  // para mostrar el hint de error inline en esos campos; se apaga en cada
  // reset/precarga. No bloquea guardar como borrador (ver `handleSave`).
  const [showTaxonomyErrors, setShowTaxonomyErrors] = useState(false);

  const reset = () => {
    setTitle("");
    setTitleFocused(false);
    setTitleTouched(false);
    setCategory("");
    setSubcategories([]);
    setSoftware([]);
    setCoverKind("image");
    setCoverUrl("");
    setCoverSizeWarning(null);
    setVideoUrl("");
    setBlocks([]);
    setTags([]);
    setCollaborators([]);
    setReleaseDate(undefined);
    setAttachments([]);
    setError(null);
    setConfirmCloseOpen(false);
    setOriginalIsPublic(false);
    setShowTaxonomyErrors(false);
    setIsDirty(false);
  };

  // Al abrir en modo edición, trae la pieza completa y precarga el Canvas;
  // al abrir en modo creación, garantiza estado limpio (por si el modal quedó
  // con datos de una edición anterior — es una única instancia persistente).
  useEffect(() => {
    if (!isOpen) return;
    skipDirtyRef.current = true;
    setIsDirty(false);
    if (!pieceId) {
      reset();
      return;
    }
    let cancelled = false;
    setLoadingPiece(true);
    setError(null);
    setTitleFocused(false);
    setTitleTouched(false);
    setShowTaxonomyErrors(false);
    getPortfolioPieceForEdit(pieceId)
      .then((piece) => {
        if (cancelled) return;
        setTitle(piece.title);
        setCategory(piece.category === "Documento" ? "" : piece.category);
        setSubcategories(piece.subcategories);
        setSoftware(piece.software);
        // La portada guardada puede ser imagen/GIF (data URL directo) o
        // video (URL real con el prefijo "video:", ver lib/coverMedia):
        // separarla aquí en `coverKind` + el campo correspondiente es lo
        // único que le permite al editor precargar el tab y la vista previa
        // correctos.
        const kind = coverKindOf(piece.coverUrl) ?? "image";
        setCoverKind(kind);
        setCoverSizeWarning(null);
        if (kind === "video") {
          setVideoUrl(resolveCoverSrc(piece.coverUrl));
          setCoverUrl("");
        } else {
          setCoverUrl(piece.coverUrl);
          setVideoUrl("");
        }
        setBlocks(piece.contentBlocks);
        setTags(piece.tags);
        setCollaborators(piece.collaborators);
        setReleaseDate(piece.releaseDate ? new Date(piece.releaseDate) : undefined);
        setAttachments(
          piece.gallery.map((url, index) => ({
            id: `${pieceId}-${index}`,
            name: `Archivo ${index + 1}`,
            url,
            kind: inferAttachmentKind(url),
          })),
        );
        setOriginalIsPublic(piece.isPublic);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar el proyecto.");
      })
      .finally(() => {
        if (!cancelled) setLoadingPiece(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pieceId]);

  // Dirty-tracking: cualquier cambio en estos campos DESPUÉS de que la carga
  // (reset o precarga de edición) terminó de aplicar los suyos marca
  // `isDirty`. `skipDirtyRef` absorbe exactamente la corrida que disparan los
  // `setState` de esa carga (batcheados en el mismo commit, o llegados juntos
  // tras el `await` de `getPortfolioPieceForEdit`) para que "abrir para
  // editar" no se confunda con "el usuario ya cambió algo".
  // biome-ignore lint/correctness/useExhaustiveDependencies: la lista de deps son justo los campos cuyo cambio debe marcar `isDirty` — el efecto no lee sus valores (solo el ref/setState), así que Biome los ve "de más", pero quitarlos rompería el tracking.
  useEffect(() => {
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setIsDirty(true);
  }, [
    title,
    category,
    subcategories,
    software,
    coverKind,
    coverUrl,
    videoUrl,
    blocks,
    releaseDate,
    attachments,
  ]);

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    setCoverSizeWarning(null);
    try {
      const url = await readFileAsDataUrl(file);
      setCoverUrl(url);
      // GIF sin recomprimir (ver MediaUpload compress={false} más abajo):
      // avisa si pesa mucho, sin bloquear — el límite real de producción
      // (Vercel, ~4.5MB) solo se confirma al intentar guardar.
      if (coverKind === "gif" && file.size > GIF_SIZE_WARNING_BYTES) {
        setCoverSizeWarning(
          `Este GIF pesa ${(file.size / (1024 * 1024)).toFixed(1)} MB. Los archivos pesados pueden fallar al publicar en producción — si el guardado falla, usa un GIF más liviano.`,
        );
      }
    } catch {
      setError("No se pudo subir la portada. Intenta de nuevo.");
    } finally {
      setCoverUploading(false);
    }
  };

  // Ver el comentario junto al `onClick` de los tiles del panel derecho
  // ("Añadir sección"): `Card` de Once UI ata el mismo `onClick` al elemento
  // externo Y al Flex interno, así que un solo click lo dispara 2 veces. El
  // MouseEvent SÍ llega en runtime (aunque `CardProps.onClick` lo tipe como
  // `() => void`); stopPropagation() ahí corta la burbuja hacia el externo
  // y deja que se agregue un único bloque por click.
  const handleAddBlockTile = (type: ContentBlockType) => (event: React.MouseEvent) => {
    event.stopPropagation();
    insertBlock(type);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    setBlocks((current) => {
      const index = current.findIndex((b) => b.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  // --- Drag-and-drop del Canvas -------------------------------------------
  // Dos orígenes posibles de arrastre comparten el mismo destino (el lienzo):
  // reordenar un bloque ya existente (handle dedicado en ContentBlockCard) o
  // instanciar uno nuevo arrastrando una herramienta del panel derecho. HTML5
  // DnD nativo (no framer-motion/Reorder) porque el mismo dropzone necesita
  // aceptar ambos orígenes con un único cómputo de índice de inserción; mezclar
  // el motor de gestos de Reorder.Group (pointer events) con dragstart/dragover
  // nativo del panel de herramientas duplicaría la lógica de la línea
  // indicadora en dos sistemas de eventos distintos.
  type BlockDragPayload =
    | { kind: "block"; id: string }
    | { kind: "tool"; blockType: ContentBlockType };

  const [dragPayload, setDragPayload] = useState<BlockDragPayload | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Drag image custom: un chip compacto (icono+label) renderizado offscreen
  // por cada tipo de herramienta (ver JSX más abajo), en vez del ghost gris
  // por defecto que captura el navegador del tile completo del panel.
  const dragPreviewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Aterrizaje suave: el bloque instanciado por click O por drop se marca
  // aquí para envolverse en RevealFx (ver render de `blocks.map` abajo) y
  // hacer scrollIntoView una vez montado; se limpia sola tras la duración de
  // la animación (RevealFx "fast" = 1000ms, ver dist/components/RevealFx.js).
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const prevBlockRectsRef = useRef<Map<string, DOMRect>>(new Map());

  const setBlockRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) blockRefs.current.set(id, el);
    else blockRefs.current.delete(id);
  };

  // Único punto de inserción de bloques nuevos (click en el panel derecho,
  // click en el "+" del lienzo, o drop de una herramienta): centraliza el
  // cómputo de índice y el marcado para la animación de aterrizaje.
  const insertBlock = (type: ContentBlockType, atIndex?: number) => {
    const block = createBlock(type);
    setBlocks((current) => {
      const next = [...current];
      next.splice(atIndex === undefined ? next.length : atIndex, 0, block);
      return next;
    });
    setJustAddedId(block.id);
  };

  useEffect(() => {
    if (!justAddedId) return;
    blockRefs.current.get(justAddedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const timeout = setTimeout(() => setJustAddedId(null), 1000);
    return () => clearTimeout(timeout);
  }, [justAddedId]);

  // Transiciones de reorden (FLIP ligero, sin librería nueva): al cambiar el
  // orden de `blocks` (drag-and-drop o botones subir/bajar), mide la nueva
  // posición de cada tarjeta contra la que tenía en el render anterior y, si
  // se movió, anima el delta con un transform que interpola a 0 — así el
  // reordenamiento se ve como un desplazamiento suave en vez de un salto
  // seco. Puramente DOM/refs (mismo patrón de medición que ResizableSplit),
  // sin animación en el primer render de cada tarjeta (no hay rect previo).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `blocks` dispara la re-medición tras cada insert/remove/reorder; el efecto lee posiciones vía blockRefs (DOM), no el array en sí.
  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    blockRefs.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });
    prevBlockRectsRef.current.forEach((prevRect, id) => {
      const el = blockRefs.current.get(id);
      const nextRect = nextRects.get(id);
      if (!el || !nextRect) return;
      const deltaY = prevRect.top - nextRect.top;
      if (Math.abs(deltaY) < 1) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${deltaY}px)`;
      // Fuerza reflow antes de reactivar la transición para que el navegador
      // no colapse los dos cambios de `transform` en uno solo.
      el.getBoundingClientRect();
      el.style.transition = "transform 220ms ease";
      el.style.transform = "";
      const clearTransition = () => {
        el.style.transition = "";
        el.removeEventListener("transitionend", clearTransition);
      };
      el.addEventListener("transitionend", clearTransition);
    });
    prevBlockRectsRef.current = nextRects;
  }, [blocks]);

  const handleBlockDragStart = (id: string) => (event: DragEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    setDragPayload({ kind: "block", id });
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  };

  const handleToolDragStart = (blockType: ContentBlockType) => (event: DragEvent) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    const previewEl = dragPreviewRefs.current[blockType];
    if (previewEl) {
      event.dataTransfer.setDragImage(
        previewEl,
        previewEl.offsetWidth / 2,
        previewEl.offsetHeight / 2,
      );
    }
    setDragPayload({ kind: "tool", blockType });
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", blockType);
  };

  const handleDragEnd = () => {
    setDragPayload(null);
    setDropIndex(null);
  };

  // Sobre un bloque puntual: decide si la línea de inserción va antes o
  // después según la mitad vertical del bloque sobre el que está el puntero.
  const handleBlockDragOver = (index: number) => (event: DragEvent) => {
    if (!dragPayload) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = dragPayload.kind === "block" ? "move" : "copy";
    const rect = event.currentTarget.getBoundingClientRect();
    const isAfter = event.clientY - rect.top > rect.height / 2;
    setDropIndex(isAfter ? index + 1 : index);
  };

  // Fallback del lienzo completo: cualquier punto que no sea un bloque
  // puntual (huecos, lienzo vacío) inserta al final.
  const handleCanvasDragOver = (event: DragEvent) => {
    if (!dragPayload) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = dragPayload.kind === "block" ? "move" : "copy";
    setDropIndex(blocks.length);
  };

  const handleCanvasDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!dragPayload || dropIndex === null) {
      handleDragEnd();
      return;
    }
    if (dragPayload.kind === "block") {
      const sourceId = dragPayload.id;
      const targetIndex = dropIndex;
      setBlocks((current) => {
        const fromIndex = current.findIndex((b) => b.id === sourceId);
        if (fromIndex === -1) return current;
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        const insertAt = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(insertAt, 0, moved);
        return next;
      });
    } else {
      insertBlock(dragPayload.blockType, dropIndex);
    }
    handleDragEnd();
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim() || !markdown.trim()) {
      setError("El título y al menos una sección de contenido son obligatorios.");
      return;
    }
    // Categoría/subcategorías solo son obligatorias para PUBLICAR (mismo
    // criterio que el server para subcategories, ver validatePieceTaxonomy en
    // actions/portfolioPieces.ts — la categoría la exige solo este cliente,
    // el server no la vuelve obligatoria). Guardar como borrador nunca
    // bloquea por esto.
    if (publish) {
      setShowTaxonomyErrors(true);
      if (!category) {
        setError("Selecciona una categoría antes de publicar.");
        return;
      }
      if (subcategories.length === 0) {
        setError("Agrega al menos una subcategoría antes de publicar.");
        return;
      }
    }
    // Portada tipo video: `videoUrl` guarda DOS formas posibles (ver
    // VideoFileDropzone/Input de abajo) — un data URL subido
    // ("data:video/mp4;base64,...", autodescriptivo, se guarda tal cual) o
    // una URL EXTERNA pegada a mano, validada con el MISMO criterio que
    // <Media> (once-ui) usa para decidir si sabe reproducirla (archivo
    // .mp4/.webm/etc. — YouTube ya no se admite en portada, ver
    // lib/coverMedia.ts): cualquier otra URL caería en next/image en la
    // vista pública y, si el host no está en `images.remotePatterns`
    // (next.config.mjs), rompe el render completo de esa página.
    let finalCoverUrl: string | undefined = coverUrl || undefined;
    if (coverKind === "video") {
      const trimmedVideoUrl = videoUrl.trim();
      if (!trimmedVideoUrl) {
        finalCoverUrl = undefined;
      } else if (isVideoDataUrl(trimmedVideoUrl)) {
        finalCoverUrl = trimmedVideoUrl;
      } else if (isPlayableVideoUrl(trimmedVideoUrl)) {
        finalCoverUrl = toVideoCoverUrl(trimmedVideoUrl);
      } else {
        setError("La URL de video no es válida. Usa una URL directa a .mp4/.webm/.mov.");
        return;
      }
    }
    setError(null);
    setSaving(publish ? "publish" : "draft");
    try {
      // Los usernames de los bloques "Colaboradores" (avatarGroup) se suman
      // al campo `collaborators` del guardado, sin duplicar lo ya precargado
      // (la action no valida/dedup) — el campo manual del panel se quitó, el
      // bloque del Canvas es la única fuente de colaboradores nueva.
      const blockCollaboratorUsernames = blocks
        .filter(
          (b): b is Extract<ContentBlock, { type: "avatarGroup" }> => b.type === "avatarGroup",
        )
        .flatMap((b) => b.avatars.map((a) => a.username))
        .filter((username): username is string => Boolean(username));
      const mergedCollaborators = Array.from(
        new Set([...collaborators, ...blockCollaboratorUsernames]),
      );
      const payload = {
        title,
        content: markdown,
        contentBlocks: blocks,
        category: category || undefined,
        subcategories,
        software,
        coverUrl: finalCoverUrl,
        isPublic: publish,
        gallery: attachments.map((attachment) => attachment.url),
        // LEGACY: passthrough sin editar (ver comentario junto al estado
        // `tags`) — nunca lo toca el usuario desde este panel.
        tags,
        collaborators: mergedCollaborators,
        releaseDate,
      };
      if (pieceId) {
        await updatePortfolioPiece(pieceId, payload);
      } else {
        await createPortfolioPiece(payload);
      }
      reset();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proyecto.");
    } finally {
      setSaving(null);
    }
  };

  // Intercepta TODOS los caminos de cierre (click afuera, Escape, botón X —
  // los tres llaman a `onClose` de `WideDialog`, ver su implementación
  // arriba): con cambios sin guardar (`isDirty`), no cierra directo — abre el
  // Dialog de confirmación con las 3 salidas (cancelar / borrador / descartar).
  const handleAttemptClose = () => {
    if (disabled) return;
    if (isDirty) {
      setConfirmCloseOpen(true);
      return;
    }
    reset();
    onClose();
  };

  return (
    <>
      <WideDialog isOpen={isOpen} onClose={handleAttemptClose}>
        {/* Drag image custom: un chip compacto (icono+label) por cada tipo de
            herramienta, renderizado fuera de pantalla pero SIN display:none
            (el navegador necesita pintarlo para poder capturarlo como drag
            image). `handleToolDragStart` llama a `setDragImage` con el nodo
            correspondiente en vez de dejar el ghost gris por defecto. */}
        <Row
          position="fixed"
          top="0"
          left="0"
          pointerEvents="none"
          zIndex={-1}
          style={{ transform: "translate(-200%, -200%)" }}
        >
          {BLOCK_TYPES.map(({ type, label, icon }) => (
            <Row
              key={type}
              ref={(el) => {
                dragPreviewRefs.current[type] = el;
              }}
              gap="8"
              vertical="center"
              padding="8"
              radius="m"
              background="surface"
              border="neutral-alpha-medium"
              shadow="l"
            >
              {type === "text" ? (
                <Text variant="heading-strong-s" onBackground="neutral-weak">
                  T
                </Text>
              ) : (
                <Icon name={icon} size="s" onBackground="neutral-weak" />
              )}
              <Text variant="label-default-s" onBackground="neutral-strong">
                {label}
              </Text>
            </Row>
          ))}
        </Row>
        <Row position="relative" fillWidth vertical="center">
          <Input
            id="project-title"
            placeholder=""
            variant="ghost"
            height="xl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => {
              setTitleFocused(false);
              setTitleTouched(true);
            }}
            disabled={disabled}
            className={`${styles.titleInput}${
              titleTouched && !title.trim() ? ` ${styles.titleInvalid}` : ""
            }`}
            style={{ paddingRight: "4rem" }}
          />
          {!title && !titleFocused && (
            <Row
              position="absolute"
              fill
              horizontal="center"
              vertical="center"
              pointerEvents="none"
              top="0"
              left="0"
            >
              <ShineFx variant="heading-strong-l" onBackground="neutral-weak">
                Nombra tu proyecto
              </ShineFx>
            </Row>
          )}
        </Row>
        {loadingPiece ? (
          <Row fill horizontal="center" vertical="center" paddingY="80">
            <Spinner size="l" ariaLabel="Cargando proyecto" />
          </Row>
        ) : (
          <Column fillWidth flex={1} paddingTop="16" style={{ minHeight: 0 }}>
            <ResizableSplit
              defaultSplit={SPLIT_DEFAULT}
              minSplit={SPLIT_MIN}
              maxSplit={SPLIT_MAX}
              leftPanel={
                // Lienzo: el scroll y el ancho los reparte ResizableSplit
                // (columna completa en mobile, caja con scroll propio en desktop).
                <Column style={{ minWidth: 0 }}>
                  <Card
                    fillWidth
                    padding="24"
                    radius="l"
                    direction="column"
                    gap="16"
                    border="neutral-alpha-weak"
                    style={{ minHeight: "100%" }}
                  >
                    <Feedback
                      variant="info"
                      description="Arma tu caso de estudio con los íconos de «Añadir sección» en el panel de la derecha; el orden en que las acomodes será el orden final de la publicación."
                    />

                    <Row fillWidth gap="12" s={{ direction: "column" }}>
                      <Column flex={1} style={{ minWidth: 0 }}>
                        <CategoryDropdownField
                          value={category}
                          onChange={setCategory}
                          disabled={disabled}
                          error={showTaxonomyErrors && !category}
                        />
                      </Column>
                      <Column flex={2} style={{ minWidth: 0 }}>
                        <SubcategoryInput
                          value={subcategories}
                          onChange={setSubcategories}
                          disabled={disabled}
                          error={showTaxonomyErrors && subcategories.length === 0}
                        />
                      </Column>
                    </Row>

                    <Column fillWidth gap="12" radius="m" border="neutral-alpha-weak" padding="16">
                      <Row fillWidth horizontal="between" vertical="center">
                        <Row gap="8" vertical="center">
                          <IconButton
                            icon={coverCollapsed ? "chevronRight" : "chevronDown"}
                            variant="tertiary"
                            size="s"
                            tooltip={coverCollapsed ? "Expandir portada" : "Colapsar portada"}
                            onClick={() => setCoverCollapsed((current) => !current)}
                            disabled={disabled}
                          />
                          <Icon name="images" size="s" onBackground="neutral-weak" />
                          <Text variant="label-strong-s" onBackground="neutral-weak">
                            Portada
                          </Text>
                        </Row>
                        {coverCollapsed && (coverKind === "video" ? videoUrl : coverUrl) && (
                          coverKind === "video" ? (
                            // Sin thumbnail real de video sin Storage (no hay
                            // forma de extraer el primer frame): mismo criterio
                            // de fallback que las tarjetas de listado (ver
                            // lib/coverMedia + fallback en ExploreFeed/
                            // ProfileView/HomeShowcase), a 64px no vale la pena
                            // ni el embed de YouTube ni el <video>.
                            <Row
                              width="64"
                              radius="s"
                              background="neutral-alpha-weak"
                              horizontal="center"
                              vertical="center"
                              style={{ aspectRatio: "16 / 9" }}
                            >
                              <Icon name="video" size="s" onBackground="neutral-weak" />
                            </Row>
                          ) : (
                            <Media
                              src={coverUrl}
                              alt="Portada"
                              aspectRatio="16 / 9"
                              // SizeProps: un `width` NUMÉRICO se interpreta como
                              // REM (ver ai/gotchas.json, mismo criterio que
                              // RevealFx.translateY) — `width={64}` renderizaba
                              // 64rem (~1024px), un thumbnail gigante que tapaba
                              // el lienzo y hacía parecer que el colapso de la
                              // portada no funcionaba (el toggle de estado sí
                              // corría bien). `"64"` como SpacingToken (string)
                              // es el equivalente real a 64px.
                              width="64"
                              radius="s"
                            />
                          )
                        )}
                      </Row>
                      {!coverCollapsed && (
                        <Column fillWidth gap="12">
                          <SegmentedControl
                            fillWidth
                            selected={coverKind}
                            onToggle={(value) => setCoverKind(value as CoverKind)}
                            buttons={COVER_KIND_OPTIONS.map((option) => ({
                              ...option,
                              disabled,
                            }))}
                          />
                          {coverKind === "video" ? (
                            // DECISIÓN (tarea "portada de video por
                            // archivo"): subir un .mp4 corto es la opción
                            // PROTAGONISTA (VideoFileDropzone, mismas reglas
                            // que lib/videoUpload.ts) — YouTube se elimina de
                            // portada. Una URL externa directa a .mp4/.webm/
                            // .mov se conserva como opción SECUNDARIA (el
                            // código ya la soportaba y sigue siendo razonable
                            // para no duplicar un archivo que ya vive en otro
                            // hosting), oculta mientras haya un video subido.
                            <Column fillWidth gap="12">
                              <VideoFileDropzone
                                value={isVideoDataUrl(videoUrl) ? videoUrl : ""}
                                onChange={setVideoUrl}
                                disabled={disabled}
                                aspectRatio="16 / 9"
                              />
                              {!isVideoDataUrl(videoUrl) && (
                                <Column fillWidth gap="8">
                                  <Input
                                    id="project-cover-video-url"
                                    label="O pega la URL de un video externo (.mp4/.webm/.mov)"
                                    placeholder="https://.../video.mp4"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    disabled={disabled}
                                    error={Boolean(videoUrl.trim()) && !isPlayableVideoUrl(videoUrl)}
                                    errorMessage={
                                      videoUrl.trim() && !isPlayableVideoUrl(videoUrl)
                                        ? "Usa una URL directa a .mp4/.webm/.mov."
                                        : undefined
                                    }
                                  />
                                  {isPlayableVideoUrl(videoUrl) && (
                                    <Column fillWidth radius="m" overflow="hidden" style={{ aspectRatio: "16 / 9" }}>
                                      <Media
                                        src={videoUrl.trim()}
                                        alt="Vista previa del video"
                                        fill
                                        fillHeight
                                      />
                                    </Column>
                                  )}
                                </Column>
                              )}
                            </Column>
                          ) : (
                            <>
                              {/* `key` fuerza remount al cambiar de tab: MediaUpload
                                  guarda su propio `previewImage` en estado interno
                                  (ver dist/modules/media/MediaUpload.impl.js) que
                                  solo se resincroniza con `initialPreviewImage` si
                                  cambia — pero al pasar de "video" a "imagen"/"gif"
                                  ese prop puede seguir siendo el mismo string vacío,
                                  y sin remount el componente no vuelve a leerlo. */}
                              <MediaUpload
                                key={coverKind}
                                aspectRatio="16 / 9"
                                // GIF: SIN compresión (compress=false evita el paso
                                // por Compressor.js/canvas, que solo captura el
                                // frame actual del GIF y mata la animación — ver
                                // dist/modules/media/MediaUpload.impl.js).
                                accept={coverKind === "gif" ? "image/gif" : "image/*"}
                                compress={coverKind === "image"}
                                resizeMaxWidth={1600}
                                resizeMaxHeight={1600}
                                initialPreviewImage={coverUrl || null}
                                emptyState={coverKind === "gif" ? "Subir GIF animado" : "Subir"}
                                loading={coverUploading}
                                onFileUpload={handleCoverUpload}
                              />
                              {coverSizeWarning && (
                                <Feedback variant="warning" description={coverSizeWarning} />
                              )}
                            </>
                          )}
                        </Column>
                      )}
                    </Column>

                    <Column
                      fillWidth
                      gap="16"
                      radius="m"
                      padding="8"
                      // Feedback del canvas como dropzone: mientras hay un drag
                      // activo (bloque existente O herramienta del panel), el
                      // lienzo completo marca su borde/fondo para comunicar
                      // "puedes soltar aquí"; `transition` (token nativo) anima
                      // el cambio de color sin CSS manual.
                      border={dragPayload ? "brand-alpha-medium" : "transparent"}
                      background={dragPayload ? "brand-alpha-weak" : "transparent"}
                      transition="micro-medium"
                      onDragOver={handleCanvasDragOver}
                      onDrop={handleCanvasDrop}
                    >
                      {blocks.length === 0 ? (
                        <Column
                          fillWidth
                          horizontal="center"
                          vertical="center"
                          radius="m"
                          border={dragPayload ? "brand-alpha-medium" : "neutral-alpha-weak"}
                          borderStyle="dashed"
                          padding="24"
                          transition="micro-medium"
                          style={{ minHeight: "4rem" }}
                        >
                          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                            Arrastra una herramienta del panel derecho aquí, o usa sus íconos
                          </Text>
                        </Column>
                      ) : (
                        blocks.map((block, index) => (
                          <Column
                            key={block.id}
                            ref={setBlockRef(block.id)}
                            fillWidth
                            gap="16"
                            onDragOver={handleBlockDragOver(index)}
                          >
                            {dragPayload && dropIndex === index && (
                              <Row
                                fillWidth
                                radius="full"
                                background="brand-strong"
                                style={{ height: "0.1875rem" }}
                              />
                            )}
                            {(() => {
                              const card = (
                                <ContentBlockCard
                                  block={block}
                                  disabled={disabled}
                                  canMoveUp={index > 0}
                                  canMoveDown={index < blocks.length - 1}
                                  isDragging={
                                    dragPayload?.kind === "block" && dragPayload.id === block.id
                                  }
                                  onMoveUp={() => moveBlock(block.id, "up")}
                                  onMoveDown={() => moveBlock(block.id, "down")}
                                  onDragHandleStart={handleBlockDragStart(block.id)}
                                  onDragHandleEnd={handleDragEnd}
                                  onChange={(next) =>
                                    setBlocks((current) =>
                                      current.map((b) => (b.id === next.id ? next : b)),
                                    )
                                  }
                                  onRemove={() =>
                                    setBlocks((current) => current.filter((b) => b.id !== block.id))
                                  }
                                />
                              );
                              // Aterrizaje suave solo para el bloque recién
                              // instanciado (click o drop): el resto se
                              // renderiza tal cual, sin volver a montar en cada
                              // reorden (mismo `key`, React solo mueve el nodo).
                              if (block.id !== justAddedId) return card;
                              return (
                                <RevealFx translateY="8" speed="fast">
                                  {card}
                                </RevealFx>
                              );
                            })()}
                          </Column>
                        ))
                      )}
                      {dragPayload && dropIndex === blocks.length && blocks.length > 0 && (
                        <Row
                          fillWidth
                          radius="full"
                          background="brand-strong"
                          style={{ height: "0.1875rem" }}
                        />
                      )}
                    </Column>

                    <Row horizontal="center" paddingTop="8">
                      <BlockTypePicker disabled={disabled} onSelect={(type) => insertBlock(type)} />
                    </Row>
                  </Card>
                </Column>
              }
              rightPanel={
                // El scroll y el ancho los reparte ResizableSplit (ver leftPanel).
                <Column gap="16">
                  <Card fillWidth padding="16" radius="l" direction="column" gap="12">
                    <Text variant="label-strong-s" onBackground="neutral-weak">
                      Añadir sección
                    </Text>
                    <Grid columns={2} gap="8">
                      {BLOCK_TYPES.map(({ type, label, icon }) => {
                        // Feedback de origen: la tarjeta arrastrada baja de
                        // opacidad mientras dura el drag y el cursor pasa a
                        // "grabbing" — comunica de dónde salió el bloque que se
                        // está soltando en el lienzo.
                        const isDraggingThisTool =
                          dragPayload?.kind === "tool" && dragPayload.blockType === type;
                        return (
                          <Card
                            key={type}
                            fillWidth
                            direction="column"
                            gap="8"
                            padding="12"
                            radius="m"
                            border="neutral-alpha-weak"
                            horizontal="center"
                            vertical="center"
                            style={{ minHeight: "5rem" }}
                            transition="micro-medium"
                            opacity={disabled ? 50 : isDraggingThisTool ? 40 : 100}
                            cursor={
                              disabled ? "not-allowed" : isDraggingThisTool ? "grabbing" : "grab"
                            }
                            // Instanciación directa (además del click, que se conserva
                            // abajo): arrastrar este tile y soltarlo en el lienzo agrega
                            // el bloque en el índice exacto donde se suelta. `onDragStart`
                            // no sufre el bug de doble disparo de `onClick` (ver comentario
                            // abajo) porque Card.js solo esparce el resto de props UNA vez,
                            // sobre el Flex interno.
                            draggable={!disabled}
                            onDragStart={disabled ? undefined : handleToolDragStart(type)}
                            onDragEnd={handleDragEnd}
                            onClick={
                              disabled
                                ? undefined
                                : // `CardProps.onClick` se declara como `() => void` (sin
                                  // evento), pero `Card.js` en runtime ata ese mismo
                                  // handler TANTO al elemento externo (ElementType) COMO
                                  // al Flex interno (ver dist/components/Card.js): un
                                  // solo click burbujea por ambos y el handler corre 2
                                  // veces, agregando el bloque por duplicado. En runtime
                                  // sí llega el MouseEvent como primer argumento (React
                                  // se lo pasa al invocar el onClick nativo), así que se
                                  // castea para poder leerlo y cortar la burbuja con
                                  // stopPropagation() antes de que llegue al externo.
                                  (handleAddBlockTile(type) as unknown as () => void)
                            }
                          >
                            <Row
                              horizontal="center"
                              vertical="center"
                              style={{ width: "1.5rem", height: "1.5rem" }}
                            >
                              {type === "text" ? (
                                <Text variant="heading-strong-m" onBackground="neutral-weak">
                                  T
                                </Text>
                              ) : (
                                <Icon name={icon} size="m" onBackground="neutral-weak" />
                              )}
                            </Row>
                            <Text
                              variant="label-default-xs"
                              onBackground="neutral-weak"
                              align="center"
                              wrap="balance"
                            >
                              {label}
                            </Text>
                          </Card>
                        );
                      })}
                    </Grid>
                  </Card>

                  {ATTACH_FILES_ENABLED && (
                    <Card fillWidth padding="16" radius="l" direction="column" gap="12">
                      <Text variant="label-strong-s" onBackground="neutral-weak">
                        Adjuntar archivos
                      </Text>
                      <Button
                        fillWidth
                        variant="secondary"
                        prefixIcon="attach"
                        onClick={() => setAttachOpen(true)}
                        disabled={disabled}
                      >
                        Adjuntar archivo
                      </Button>
                      <Line background="neutral-alpha-weak" />
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        Añade archivos de fuentes, ilustraciones, fotos, o links para compartir.
                      </Text>
                    </Card>
                  )}

                  <Card fillWidth padding="16" radius="l" direction="column" gap="12">
                    <Text variant="label-strong-s" onBackground="neutral-weak">
                      Editar proyecto
                    </Text>
                    <TagInput
                      id="project-software"
                      label="Software implementado"
                      placeholder="Escribe y presiona coma (,) para agregar"
                      description={`${software.length}/${MAX_SOFTWARE} programas`}
                      value={software}
                      onChange={(next) => setSoftware(next.slice(0, MAX_SOFTWARE))}
                      disabled={disabled}
                    />
                    <Row fillWidth gap="8" vertical="end">
                      <Column fillWidth>
                        <DateInput
                          id="project-release-date"
                          label="Fecha de lanzamiento (opcional)"
                          value={releaseDate}
                          onChange={setReleaseDate}
                          disabled={disabled}
                        />
                      </Column>
                      {releaseDate && (
                        <IconButton
                          icon="close"
                          variant="tertiary"
                          tooltip="Quitar fecha"
                          onClick={() => setReleaseDate(undefined)}
                          disabled={disabled}
                        />
                      )}
                    </Row>
                  </Card>

                  {error && <Feedback variant="danger" description={error} />}

                  <Column gap="8">
                    <Button
                      fillWidth
                      variant="primary"
                      onClick={() => handleSave(true)}
                      loading={saving === "publish"}
                      disabled={disabled}
                    >
                      {pieceId ? "Guardar cambios" : "Publicar proyecto"}
                    </Button>
                    <Button
                      fillWidth
                      variant="secondary"
                      onClick={() => handleSave(false)}
                      loading={saving === "draft"}
                      disabled={disabled}
                    >
                      Guardar como borrador
                    </Button>
                  </Column>
                </Column>
              }
            />
          </Column>
        )}
      </WideDialog>

      <AttachFilesModal
        isOpen={isAttachOpen}
        onClose={() => setAttachOpen(false)}
        initialAttachments={attachments}
        onConfirm={setAttachments}
      />

      {/* Intercepta los 3 caminos de cierre de WideDialog (click afuera, X,
          Escape — todos pasan por `handleAttemptClose`) cuando hay cambios
          sin guardar (`isDirty`). Tres salidas, de menos a más destructiva. */}
      <Dialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="¿Salir sin guardar los cambios?"
        description="Tienes cambios sin guardar en este proyecto. Elige qué hacer antes de salir."
        footer={
          <Row fillWidth gap="8" horizontal="end" wrap>
            <Button
              variant="tertiary"
              size="m"
              onClick={() => setConfirmCloseOpen(false)}
              disabled={saving !== null}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              size="m"
              onClick={() => handleSave(false)}
              loading={saving === "draft"}
              disabled={saving === "publish"}
            >
              Guardar en borrador
            </Button>
            <Button
              variant="danger"
              size="m"
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={saving !== null}
            >
              Salir de todos modos
            </Button>
          </Row>
        }
      >
        {pieceId && originalIsPublic && (
          <Feedback
            variant="warning"
            description="Este proyecto ya está publicado: guardarlo como borrador lo ocultará del portafolio hasta que lo publiques de nuevo."
          />
        )}
      </Dialog>
    </>
  );
}
