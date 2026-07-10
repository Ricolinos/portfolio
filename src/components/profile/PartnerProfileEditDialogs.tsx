"use client";

import { Button, Column, Feedback, Input, Modal, Row, Slider, Switch, Text, Textarea } from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  updateCoverImage,
  updateDesignerCard,
  updateFeaturedImage,
  updatePartnerContactSharing,
  updatePartnerVisibility,
  type DesignerCardInput,
} from "@/app/actions/updateProfile";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";

const MAX_COVER_BYTES = 4 * 1024 * 1024;
// Salida final de la portada (proporción ~3:1 como el banner del perfil)
const COVER_W = 1500;
const COVER_H = 500;
// Lado del viewport de encuadre en pantalla, misma proporción 3:1.
const CROP_VIEW_W = 480;
const CROP_VIEW_H = 160;
// La server action rechaza data URLs mayores: se baja la calidad hasta caber.
const MAX_COVER_DATA_URL_CHARS = 700_000;
const JPEG_QUALITIES = [0.82, 0.7, 0.55, 0.4];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const MAX_FEATURED_BYTES = 4 * 1024 * 1024;
// Salida final de la imagen destacada, misma proporción vertical 3:4 de la
// tarjeta Designerd en Explorar.
const FEATURED_W = 900;
const FEATURED_H = 1200;
// Lado del viewport de encuadre en pantalla, misma proporción 3:4.
const FEATURED_CROP_VIEW_W = 210;
const FEATURED_CROP_VIEW_H = 280;
const MAX_FEATURED_DATA_URL_CHARS = 700_000;
const MAX_CARD_QUOTE_CHARS = 180;
const MAX_HEADLINE_CHARS = 60;
const MAX_BIO_CHARS = 280;

const modalBackdrop = <BrandModalBackdrop />;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

// Comprime el canvas a JPEG bajando la calidad hasta caber en el límite de la BD.
function canvasToDataUrl(canvas: HTMLCanvasElement, maxChars: number): string {
  for (const quality of JPEG_QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= maxChars) return dataUrl;
  }
  throw new Error("La imagen es demasiado pesada incluso comprimida.");
}

// ─── Encuadre arrastrable de la portada ───────────────────────────────────────
// Mismo patrón que el recorte de avatar, en formato panorámico 3:1: el usuario
// arrastra y hace zoom para elegir exactamente qué parte de la imagen queda
// visible, en vez de un recorte automático centrado.
function CoverCropper({
  file,
  exportRef,
}: {
  file: File;
  exportRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    let cancelled = false;
    setUrl(objectUrl);
    setOffset({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setDims(null);
    loadImage(objectUrl)
      .then((img) => {
        if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight });
      })
      // El cleanup revoca la URL con la carga en vuelo (StrictMode monta el
      // efecto dos veces en dev): ese onerror es esperado, no un fallo real.
      .catch(() => undefined);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const baseScale = dims ? Math.max(CROP_VIEW_W / dims.w, CROP_VIEW_H / dims.h) : 1;
  const scale = baseScale * zoom;
  const maxX = dims ? Math.max(0, (dims.w * scale - CROP_VIEW_W) / 2) : 0;
  const maxY = dims ? Math.max(0, (dims.h * scale - CROP_VIEW_H) / 2) : 0;
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

  // Al bajar el zoom los límites se encogen: re-encajar el offset para que
  // nunca queden bordes vacíos dentro del viewport.
  const handleZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    if (!dims) return;
    const nextScale = baseScale * nextZoom;
    const nextMaxX = Math.max(0, (dims.w * nextScale - CROP_VIEW_W) / 2);
    const nextMaxY = Math.max(0, (dims.h * nextScale - CROP_VIEW_H) / 2);
    setOffset((current) => ({
      x: clamp(current.x, nextMaxX),
      y: clamp(current.y, nextMaxY),
    }));
  };

  useEffect(() => {
    exportRef.current = async () => {
      if (!url || !dims) return null;
      const img = await loadImage(url);
      // Zona visible del viewport en coordenadas de la imagen original
      const srcW = CROP_VIEW_W / scale;
      const srcH = CROP_VIEW_H / scale;
      const srcX = (dims.w - srcW) / 2 - offset.x / scale;
      const srcY = (dims.h - srcH) / 2 - offset.y / scale;
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, COVER_W, COVER_H);
      return canvasToDataUrl(canvas, MAX_COVER_DATA_URL_CHARS);
    };
    return () => {
      exportRef.current = null;
    };
  }, [url, dims, offset, scale, exportRef]);

  return (
    <Column gap="8" horizontal="center" fillWidth>
      <div
        role="application"
        aria-label="Arrastra la imagen para reencuadrar la portada"
        style={{
          width: CROP_VIEW_W,
          height: CROP_VIEW_H,
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-l)",
          touchAction: "none",
          cursor: dragRef.current ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          setOffset({
            x: clamp(drag.ox + (e.clientX - drag.startX), maxX),
            y: clamp(drag.oy + (e.clientY - drag.startY), maxY),
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {url && dims && (
          // eslint-disable-next-line @next/next/no-img-element -- objectURL local, sin optimización posible
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: dims.w * scale,
              height: dims.h * scale,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      <Row gap="12" vertical="center" style={{ width: CROP_VIEW_W }}>
        <Text variant="label-default-s" onBackground="neutral-weak">
          Zoom
        </Text>
        <Slider
          aria-label="Zoom de la imagen"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={handleZoom}
          disabled={!dims}
        />
      </Row>
      <Text variant="label-default-s" onBackground="neutral-weak">
        Arrastra la imagen para centrarla o reencuadrarla
      </Text>
    </Column>
  );
}

// ─── Cambiar imagen de portada ────────────────────────────────────────────────
export function CoverUploadDialog({
  isOpen,
  onClose,
  currentCoverUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentCoverUrl?: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exportCrop = useRef<(() => Promise<string | null>) | null>(null);

  // MediaUpload comprime al vuelo, pero si su compresión falla entrega el
  // archivo ORIGINAL sin avisar — el peso se valida sobre lo que llega.
  // La resolución no se restringe aquí: el encuadre exporta siempre 1500×500.
  const handleFileUpload = async (selected: File) => {
    setFile(null);
    if (selected.size > MAX_COVER_BYTES) {
      setError("La imagen supera el máximo de 4MB permitido.");
      return;
    }
    setError(null);
    setFile(selected);
  };

  const persist = async (dataUrl: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await updateCoverImage(dataUrl);
      setFile(null);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la portada.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await exportCrop.current?.();
      if (!dataUrl) throw new Error("crop");
      await persist(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "crop"
          ? err.message
          : "No se pudo procesar la imagen.",
      );
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imagen de portada" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Sube únicamente imágenes libres de derechos de autor y sin contenido ofensivo. Máximo 4MB. Arrastra y haz zoom para elegir cómo se ve tu portada (1500 × 500 px)."
        />

        {file ? (
          <Column gap="12" fillWidth horizontal="center">
            <CoverCropper file={file} exportRef={exportCrop} />
            <Button variant="tertiary" size="s" onClick={() => setFile(null)} disabled={saving}>
              Elegir otra imagen
            </Button>
          </Column>
        ) : (
          <MediaUpload
            aspectRatio="3 / 1"
            accept="image/*"
            initialPreviewImage={currentCoverUrl ?? null}
            emptyState="Arrastra una imagen o haz click para buscar"
            onFileUpload={handleFileUpload}
          />
        )}

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          {currentCoverUrl && (
            <Button variant="tertiary" size="m" onClick={() => persist(null)} disabled={saving}>
              Quitar portada
            </Button>
          )}
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleSave} loading={saving} disabled={!file}>
            Guardar portada
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

// ─── Encuadre arrastrable de la imagen destacada ─────────────────────────────
// Mismo patrón que CoverCropper, en formato vertical 3:4 (el mismo aspect
// ratio que la tarjeta Designerd en Explorar).
function FeaturedImageCropper({
  file,
  exportRef,
}: {
  file: File;
  exportRef: React.MutableRefObject<(() => Promise<string | null>) | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    let cancelled = false;
    setUrl(objectUrl);
    setOffset({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setDims(null);
    loadImage(objectUrl)
      .then((img) => {
        if (!cancelled) setDims({ w: img.naturalWidth, h: img.naturalHeight });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const baseScale = dims
    ? Math.max(FEATURED_CROP_VIEW_W / dims.w, FEATURED_CROP_VIEW_H / dims.h)
    : 1;
  const scale = baseScale * zoom;
  const maxX = dims ? Math.max(0, (dims.w * scale - FEATURED_CROP_VIEW_W) / 2) : 0;
  const maxY = dims ? Math.max(0, (dims.h * scale - FEATURED_CROP_VIEW_H) / 2) : 0;
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

  const handleZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    if (!dims) return;
    const nextScale = baseScale * nextZoom;
    const nextMaxX = Math.max(0, (dims.w * nextScale - FEATURED_CROP_VIEW_W) / 2);
    const nextMaxY = Math.max(0, (dims.h * nextScale - FEATURED_CROP_VIEW_H) / 2);
    setOffset((current) => ({
      x: clamp(current.x, nextMaxX),
      y: clamp(current.y, nextMaxY),
    }));
  };

  useEffect(() => {
    exportRef.current = async () => {
      if (!url || !dims) return null;
      const img = await loadImage(url);
      const srcW = FEATURED_CROP_VIEW_W / scale;
      const srcH = FEATURED_CROP_VIEW_H / scale;
      const srcX = (dims.w - srcW) / 2 - offset.x / scale;
      const srcY = (dims.h - srcH) / 2 - offset.y / scale;
      const canvas = document.createElement("canvas");
      canvas.width = FEATURED_W;
      canvas.height = FEATURED_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, FEATURED_W, FEATURED_H);
      return canvasToDataUrl(canvas, MAX_FEATURED_DATA_URL_CHARS);
    };
    return () => {
      exportRef.current = null;
    };
  }, [url, dims, offset, scale, exportRef]);

  return (
    <Column gap="8" horizontal="center" fillWidth>
      <div
        role="application"
        aria-label="Arrastra la imagen para reencuadrar la tarjeta"
        style={{
          width: FEATURED_CROP_VIEW_W,
          height: FEATURED_CROP_VIEW_H,
          position: "relative",
          overflow: "hidden",
          borderRadius: "var(--radius-l)",
          touchAction: "none",
          cursor: dragRef.current ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current;
          if (!drag) return;
          setOffset({
            x: clamp(drag.ox + (e.clientX - drag.startX), maxX),
            y: clamp(drag.oy + (e.clientY - drag.startY), maxY),
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
      >
        {url && dims && (
          // eslint-disable-next-line @next/next/no-img-element -- objectURL local, sin optimización posible
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: dims.w * scale,
              height: dims.h * scale,
              maxWidth: "none",
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
      <Row gap="12" vertical="center" style={{ width: FEATURED_CROP_VIEW_W }}>
        <Text variant="label-default-s" onBackground="neutral-weak">
          Zoom
        </Text>
        <Slider
          aria-label="Zoom de la imagen"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          onChange={handleZoom}
          disabled={!dims}
        />
      </Row>
      <Text variant="label-default-s" onBackground="neutral-weak">
        Arrastra la imagen para centrarla o reencuadrarla
      </Text>
    </Column>
  );
}

// ─── Cambiar imagen destacada de la tarjeta Designerd ────────────────────────
export function FeaturedImageUploadDialog({
  isOpen,
  onClose,
  currentFeaturedUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentFeaturedUrl?: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exportCrop = useRef<(() => Promise<string | null>) | null>(null);

  const handleFileUpload = async (selected: File) => {
    setFile(null);
    if (selected.size > MAX_FEATURED_BYTES) {
      setError("La imagen supera el máximo de 4MB permitido.");
      return;
    }
    setError(null);
    setFile(selected);
  };

  const persist = async (dataUrl: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await updateFeaturedImage(dataUrl);
      setFile(null);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la imagen destacada.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    setError(null);
    try {
      const dataUrl = await exportCrop.current?.();
      if (!dataUrl) throw new Error("crop");
      await persist(dataUrl);
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "crop"
          ? err.message
          : "No se pudo procesar la imagen.",
      );
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imagen destacada" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Esta imagen es el fondo de tu tarjeta en Explorar / designerds. Sube únicamente imágenes libres de derechos de autor y sin contenido ofensivo. Máximo 4MB; formato vertical 3:4."
        />

        {file ? (
          <Column gap="12" fillWidth horizontal="center">
            <FeaturedImageCropper file={file} exportRef={exportCrop} />
            <Button variant="tertiary" size="s" onClick={() => setFile(null)} disabled={saving}>
              Elegir otra imagen
            </Button>
          </Column>
        ) : (
          <MediaUpload
            aspectRatio="3 / 4"
            accept="image/*"
            initialPreviewImage={currentFeaturedUrl ?? null}
            emptyState="Arrastra una imagen o haz click para buscar"
            onFileUpload={handleFileUpload}
          />
        )}

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          {currentFeaturedUrl && (
            <Button variant="tertiary" size="m" onClick={() => persist(null)} disabled={saving}>
              Quitar imagen
            </Button>
          )}
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleSave} loading={saving} disabled={!file}>
            Guardar imagen
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

// ─── Editar el contenido de la tarjeta Designerd (cita, puesto, bio) ─────────
export function DesignerCardDialog({
  isOpen,
  onClose,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial: DesignerCardInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<DesignerCardInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reabrir el modal debe partir del valor guardado, no de un borrador previo sin guardar.
  useEffect(() => {
    if (isOpen) setForm(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tooLong =
    form.cardQuote.length > MAX_CARD_QUOTE_CHARS ||
    form.headline.length > MAX_HEADLINE_CHARS ||
    form.bio.length > MAX_BIO_CHARS;

  const handleSave = async () => {
    if (tooLong) return;
    setSaving(true);
    setError(null);
    try {
      await updateDesignerCard(form);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tarjeta de Designerd" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Este contenido aparece en tu tarjeta de Explorar / designerds: la cita sobre tu imagen destacada y el puesto/descripción al voltearla."
        />

        <Input
          id="designer-headline"
          label="Puesto"
          placeholder="Ej. Diseñador de marca"
          value={form.headline}
          maxLength={MAX_HEADLINE_CHARS}
          characterCount
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
        />
        <Textarea
          id="designer-quote"
          label="Cita"
          placeholder="Una frase corta que te represente"
          lines={2}
          value={form.cardQuote}
          maxLength={MAX_CARD_QUOTE_CHARS}
          characterCount
          onChange={(e) => setForm((f) => ({ ...f, cardQuote: e.target.value }))}
        />
        <Textarea
          id="designer-bio"
          label="Descripción breve"
          placeholder="Cuéntanos brevemente quién eres y qué haces"
          lines={4}
          value={form.bio}
          maxLength={MAX_BIO_CHARS}
          characterCount
          onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
        />

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleSave} loading={saving} disabled={tooLong}>
            Guardar cambios
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

// ─── Editar información de perfil (visibilidad) ──────────────────────────────
export function PartnerSettingsDialog({
  isOpen,
  onClose,
  initialIsPublic,
  initialShareWhatsapp,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialIsPublic: boolean;
  initialShareWhatsapp: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareWhatsapp, setShareWhatsapp] = useState(initialShareWhatsapp);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reabrir el modal debe partir del valor guardado, no del último toggle sin guardar.
  useEffect(() => {
    if (isOpen) {
      setIsPublic(initialIsPublic);
      setShareWhatsapp(initialShareWhatsapp);
    }
  }, [isOpen, initialIsPublic, initialShareWhatsapp]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        updatePartnerVisibility(isPublic),
        updatePartnerContactSharing(shareWhatsapp),
      ]);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar información de perfil"
      backdrop={modalBackdrop}
    >
      <Column gap="16" fillWidth paddingTop="12">
        <Row
          fillWidth
          horizontal="between"
          vertical="center"
          gap="16"
          padding="16"
          radius="m"
          border="neutral-alpha-weak"
          background="neutral-alpha-weak"
        >
          <Column gap="4">
            <Text variant="label-strong-s">Perfil público</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Tu tarjeta aparece en Explorar / designerds. Si lo desactivas, tu perfil seguirá
              disponible buscándolo por nombre de usuario.
            </Text>
          </Column>
          <Switch
            isChecked={isPublic}
            onToggle={() => setIsPublic((v) => !v)}
            ariaLabel="Mantener mi perfil público en Explorar"
          />
        </Row>

        <Row
          fillWidth
          horizontal="between"
          vertical="center"
          gap="16"
          padding="16"
          radius="m"
          border="neutral-alpha-weak"
          background="neutral-alpha-weak"
        >
          <Column gap="4">
            <Text variant="label-strong-s">Compartir mi WhatsApp</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Solo lo verán usuarios registrados de la plataforma que visiten tu perfil. Nunca se
              muestra a visitantes anónimos. Apagado por defecto.
            </Text>
          </Column>
          <Switch
            isChecked={shareWhatsapp}
            onToggle={() => setShareWhatsapp((v) => !v)}
            ariaLabel="Compartir mi WhatsApp con otros usuarios de la plataforma"
          />
        </Row>

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}
