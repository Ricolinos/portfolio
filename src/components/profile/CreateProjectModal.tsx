"use client";

import {
  Button,
  Card,
  Column,
  DateInput,
  Dialog,
  Feedback,
  Icon,
  IconButton,
  Input,
  Line,
  Row,
  ScrollLock,
  TagInput,
  Text,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { createPortfolioPiece } from "@/app/actions/portfolioPieces";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { readFileAsDataUrl } from "@/lib/files";
import { AttachFilesModal, type ProjectAttachment } from "./AttachFilesModal";
import {
  BLOCK_TYPES,
  blocksToMarkdown,
  type ContentBlock,
  ContentBlockCard,
  createBlock,
} from "./ContentBlocks";

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

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const markdown = useMemo(() => blocksToMarkdown(blocks), [blocks]);
  const [tags, setTags] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [isAttachOpen, setAttachOpen] = useState(false);
  const [isConfirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const disabled = saving !== null;

  const reset = () => {
    setTitle("");
    setCategory("");
    setCoverUrl("");
    setBlocks([]);
    setTags([]);
    setCollaborators([]);
    setReleaseDate(undefined);
    setAttachments([]);
    setError(null);
    setConfirmCloseOpen(false);
  };

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

  const handleSave = async (publish: boolean) => {
    if (!title.trim() || !markdown.trim()) {
      setError("El título y al menos una sección de contenido son obligatorios.");
      return;
    }
    setError(null);
    setSaving(publish ? "publish" : "draft");
    try {
      await createPortfolioPiece({
        title,
        content: markdown,
        category: category || undefined,
        coverUrl: coverUrl || undefined,
        isPublic: publish,
        gallery: attachments.map((attachment) => attachment.url),
        tags,
        collaborators,
        releaseDate,
      });
      reset();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proyecto.");
    } finally {
      setSaving(null);
    }
  };

  // Ya con archivos adjuntados, cerrar por accidente (click afuera, Escape o
  // la X) pierde ese avance: se advierte antes de salir en vez de cerrar directo.
  const handleAttemptClose = () => {
    if (disabled) return;
    if (attachments.length > 0) {
      setConfirmCloseOpen(true);
      return;
    }
    reset();
    onClose();
  };

  return (
    <>
      <WideDialog isOpen={isOpen} onClose={handleAttemptClose}>
        <Input
          id="project-title"
          placeholder="Nombre de tu proyecto"
          variant="ghost"
          height="xl"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
          style={{ paddingRight: "4rem" }}
        />
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

                  {blocks.map((block, index) => (
                    <ContentBlockCard
                      key={block.id}
                      block={block}
                      disabled={disabled}
                      canMoveUp={index > 0}
                      canMoveDown={index < blocks.length - 1}
                      onMoveUp={() => moveBlock(block.id, "up")}
                      onMoveDown={() => moveBlock(block.id, "down")}
                      onChange={(next) =>
                        setBlocks((current) => current.map((b) => (b.id === next.id ? next : b)))
                      }
                      onRemove={() =>
                        setBlocks((current) => current.filter((b) => b.id !== block.id))
                      }
                    />
                  ))}
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
                  <Row gap="8" style={{ overflowX: "auto" }}>
                    {BLOCK_TYPES.map(({ type, label, icon }) => (
                      <IconButton
                        key={type}
                        icon={icon}
                        tooltip={label}
                        tooltipPosition="top"
                        variant="secondary"
                        size="l"
                        disabled={disabled}
                        onClick={() => setBlocks((current) => [...current, createBlock(type)])}
                      />
                    ))}
                  </Row>
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
                    Publicar proyecto
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
      </WideDialog>

      <AttachFilesModal
        isOpen={isAttachOpen}
        onClose={() => setAttachOpen(false)}
        initialAttachments={attachments}
        onConfirm={setAttachments}
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
