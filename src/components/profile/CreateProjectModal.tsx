"use client";

import {
  Button,
  Card,
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
  Row,
  ScrollLock,
  ShineFx,
  Spinner,
  TagInput,
  Text,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useRouter } from "next/navigation";
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  createPortfolioPiece,
  getPortfolioPieceForEdit,
  updatePortfolioPiece,
} from "@/app/actions/portfolioPieces";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { readFileAsDataUrl } from "@/lib/files";
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
const MAX_TAGS = 5;

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
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const [tags, setTags] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  // Solo se activa cuando el usuario adjunta algo EN esta sesión del editor;
  // los adjuntos ya guardados que llegan al precargar una edición no cuentan,
  // o el diálogo de "se pierde tu avance" dispararía al abrir cualquier pieza
  // que ya tuviera archivos.
  const [attachmentsTouched, setAttachmentsTouched] = useState(false);
  const [isAttachOpen, setAttachOpen] = useState(false);
  const [isConfirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPiece, setLoadingPiece] = useState(false);
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const disabled = saving !== null || loadingPiece;

  const reset = () => {
    setTitle("");
    setTitleFocused(false);
    setTitleTouched(false);
    setCategory("");
    setCoverUrl("");
    setBlocks([]);
    setTags([]);
    setCollaborators([]);
    setReleaseDate(undefined);
    setAttachments([]);
    setAttachmentsTouched(false);
    setError(null);
    setConfirmCloseOpen(false);
  };

  // Al abrir en modo edición, trae la pieza completa y precarga el Canvas;
  // al abrir en modo creación, garantiza estado limpio (por si el modal quedó
  // con datos de una edición anterior — es una única instancia persistente).
  useEffect(() => {
    if (!isOpen) return;
    if (!pieceId) {
      reset();
      return;
    }
    let cancelled = false;
    setLoadingPiece(true);
    setError(null);
    setTitleFocused(false);
    setTitleTouched(false);
    getPortfolioPieceForEdit(pieceId)
      .then((piece) => {
        if (cancelled) return;
        setTitle(piece.title);
        setCategory(piece.category === "Documento" ? "" : piece.category);
        setCoverUrl(piece.coverUrl);
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
        setAttachmentsTouched(false);
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

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const url = await readFileAsDataUrl(file);
      setCoverUrl(url);
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
  const handleAddBlockTile =
    (type: ContentBlockType) =>
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setBlocks((current) => [...current, createBlock(type)]);
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
      const blockType = dragPayload.blockType;
      const targetIndex = dropIndex;
      setBlocks((current) => {
        const next = [...current];
        next.splice(targetIndex, 0, createBlock(blockType));
        return next;
      });
    }
    handleDragEnd();
  };

  const handleSave = async (publish: boolean) => {
    if (!title.trim() || !markdown.trim()) {
      setError("El título y al menos una sección de contenido son obligatorios.");
      return;
    }
    setError(null);
    setSaving(publish ? "publish" : "draft");
    try {
      const payload = {
        title,
        content: markdown,
        contentBlocks: blocks,
        category: category || undefined,
        coverUrl: coverUrl || undefined,
        isPublic: publish,
        gallery: attachments.map((attachment) => attachment.url),
        tags,
        collaborators,
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

  // Con archivos adjuntados EN ESTA SESIÓN, cerrar por accidente (click
  // afuera, Escape o la X) pierde ese avance: se advierte antes de salir en
  // vez de cerrar directo. No aplica a los adjuntos que ya traía la pieza.
  const handleAttemptClose = () => {
    if (disabled) return;
    if (attachmentsTouched) {
      setConfirmCloseOpen(true);
      return;
    }
    reset();
    onClose();
  };

  return (
    <>
      <WideDialog isOpen={isOpen} onClose={handleAttemptClose}>
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

                  <Input
                    id="project-category"
                    placeholder="Categoría (Branding, Motion, Web…)"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={disabled}
                  />

                  <Column fillWidth gap="12" radius="m" border="neutral-alpha-weak" padding="16">
                    <Row gap="8" vertical="center">
                      <Icon name="images" size="s" onBackground="neutral-weak" />
                      <Text variant="label-strong-s" onBackground="neutral-weak">
                        Portada
                      </Text>
                    </Row>
                    <MediaUpload
                      aspectRatio="16 / 9"
                      accept="image/*"
                      compress
                      resizeMaxWidth={1600}
                      resizeMaxHeight={1600}
                      initialPreviewImage={coverUrl || null}
                      emptyState="Subir"
                      loading={coverUploading}
                      onFileUpload={handleCoverUpload}
                    />
                  </Column>

                  <Column
                    fillWidth
                    gap="16"
                    onDragOver={handleCanvasDragOver}
                    onDrop={handleCanvasDrop}
                  >
                    {blocks.length === 0 ? (
                      <Column
                        fillWidth
                        horizontal="center"
                        vertical="center"
                        radius="m"
                        border="neutral-alpha-weak"
                        borderStyle="dashed"
                        padding="24"
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
                    <BlockTypePicker
                      disabled={disabled}
                      onSelect={(type) =>
                        setBlocks((current) => [...current, createBlock(type)])
                      }
                    />
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
                    {BLOCK_TYPES.map(({ type, label, icon }) => (
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
                        opacity={disabled ? 50 : 100}
                        cursor={disabled ? "not-allowed" : "interactive"}
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
                              ((handleAddBlockTile(type) as unknown) as () => void)
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
                    ))}
                  </Grid>
                </Card>

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

                <Card fillWidth padding="16" radius="l" direction="column" gap="12">
                  <Text variant="label-strong-s" onBackground="neutral-weak">
                    Editar proyecto
                  </Text>
                  <TagInput
                    id="project-tags"
                    label="Etiquetas"
                    placeholder="Escribe y presiona coma (,) para agregar"
                    description={`${tags.length}/${MAX_TAGS} etiquetas`}
                    value={tags}
                    onChange={(next) => setTags(next.slice(0, MAX_TAGS))}
                    disabled={disabled}
                  />
                  <TagInput
                    id="project-collaborators"
                    label="Colaboradores"
                    placeholder="Nombre de usuario y coma (,) para agregar"
                    value={collaborators}
                    onChange={setCollaborators}
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
        onConfirm={(next) => {
          setAttachments(next);
          setAttachmentsTouched(true);
        }}
      />

      <Dialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="¿Cerrar el editor de proyectos?"
        description="Ya adjuntaste archivos a este proyecto. Si cierras sin guardar, ese avance se pierde."
        footer={
          <Row fillWidth gap="8" horizontal="end">
            <Button variant="secondary" size="m" onClick={() => setConfirmCloseOpen(false)}>
              Seguir editando
            </Button>
            <Button
              variant="primary"
              size="m"
              onClick={() => handleSave(false)}
              loading={saving === "draft"}
            >
              Guardar en borradores
            </Button>
          </Row>
        }
      />
    </>
  );
}
