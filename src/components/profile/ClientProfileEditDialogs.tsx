"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { Button, Column, Feedback, Input, Modal, Row, Slider, Text } from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { updateProfileInfo, syncProfileImage, type ProfileInfoInput } from "@/app/actions/updateProfile";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
// Salida final del recorte: la restricción de 400×400 se garantiza aquí.
const OUTPUT_PX = 400;
// Lado del viewport de encuadre en pantalla.
const CROP_VIEW = 240;
const MAX_MOTTO_WORDS = 15;

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    // Error real en lugar del Event crudo: sin esto un rechazo no capturado
    // aparece en consola como "[object Event]"
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const modalBackdrop = <BrandModalBackdrop />;

// ─── Encuadre arrastrable ─────────────────────────────────────────────────────
// La imagen se muestra a escala "cover" (× zoom) dentro de un viewport
// cuadrado; el usuario la arrastra para centrar/reencuadrar y el export
// dibuja la zona visible en un canvas de 400×400.
function AvatarCropper({
  file,
  exportRef,
}: {
  file: File;
  exportRef: React.MutableRefObject<(() => Promise<File | null>) | null>;
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

  const scale = dims ? (CROP_VIEW / Math.min(dims.w, dims.h)) * zoom : 1;
  const maxX = dims ? Math.max(0, (dims.w * scale - CROP_VIEW) / 2) : 0;
  const maxY = dims ? Math.max(0, (dims.h * scale - CROP_VIEW) / 2) : 0;
  const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));

  // Al bajar el zoom los límites se encogen: re-encajar el offset para que
  // nunca queden bordes vacíos dentro del viewport.
  const handleZoom = (nextZoom: number) => {
    setZoom(nextZoom);
    if (!dims) return;
    const nextScale = (CROP_VIEW / Math.min(dims.w, dims.h)) * nextZoom;
    const nextMaxX = Math.max(0, (dims.w * nextScale - CROP_VIEW) / 2);
    const nextMaxY = Math.max(0, (dims.h * nextScale - CROP_VIEW) / 2);
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
      const srcSize = CROP_VIEW / scale;
      const srcX = (dims.w - srcSize) / 2 - offset.x / scale;
      const srcY = (dims.h - srcSize) / 2 - offset.y / scale;
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_PX;
      canvas.height = OUTPUT_PX;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_PX, OUTPUT_PX);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : null;
    };
    return () => {
      exportRef.current = null;
    };
  }, [url, dims, offset, scale, exportRef]);

  return (
    <Column gap="8" horizontal="center" fillWidth>
      <div
        role="application"
        aria-label="Arrastra la imagen para reencuadrarla"
        style={{
          width: CROP_VIEW,
          height: CROP_VIEW,
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
        {/* Guía circular: cómo se verá dentro del Avatar */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
            pointerEvents: "none",
          }}
        />
      </div>
      <Row gap="12" vertical="center" style={{ width: CROP_VIEW }}>
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

// ─── Cambiar imagen de perfil ─────────────────────────────────────────────────
export function AvatarUploadDialog({
  isOpen,
  onClose,
  currentImageUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentImageUrl?: string;
}) {
  const { user } = useUser();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const exportCrop = useRef<(() => Promise<File | null>) | null>(null);

  // MediaUpload comprime al vuelo, pero si su compresión falla entrega el
  // archivo ORIGINAL sin avisar — el peso se valida sobre lo que llega.
  // La resolución no se restringe aquí: el encuadre exporta siempre 400×400.
  const handleFileUpload = async (selected: File) => {
    setFile(null);
    if (selected.size > MAX_AVATAR_BYTES) {
      setError("La imagen supera el máximo de 2MB permitido.");
      return;
    }
    setError(null);
    setFile(selected);
  };

  const handleSave = async () => {
    if (!user || !file) return;
    setSaving(true);
    setError(null);
    try {
      const cropped = await exportCrop.current?.();
      if (!cropped) throw new Error("crop");
      await user.setProfileImage({ file: cropped });
      await syncProfileImage();
      setFile(null);
      onClose();
      router.refresh();
    } catch {
      setError("No se pudo actualizar la imagen. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imagen de perfil" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Sube únicamente imágenes libres de derechos de autor y sin contenido ofensivo. Te sugerimos una foto real de ti. Máximo 2MB; la imagen final se recorta a 400 × 400 px."
        />

        {file ? (
          <Column gap="12" fillWidth horizontal="center">
            <AvatarCropper file={file} exportRef={exportCrop} />
            <Button
              variant="tertiary"
              size="s"
              onClick={() => setFile(null)}
              disabled={saving}
            >
              Elegir otra imagen
            </Button>
          </Column>
        ) : (
          <Row fillWidth horizontal="center">
            <MediaUpload
              aspectRatio="1 / 1"
              maxWidth={16}
              accept="image/*"
              compress
              resizeMaxWidth={1024}
              resizeMaxHeight={1024}
              initialPreviewImage={currentImageUrl ?? null}
              emptyState="Arrastra una imagen o haz click para buscar"
              onFileUpload={handleFileUpload}
            />
          </Row>
        )}

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
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

// ─── Editar información del perfil ────────────────────────────────────────────
export function EditInfoDialog({
  isOpen,
  onClose,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial: ProfileInfoInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileInfoInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const mottoWords = countWords(form.motto);
  const mottoTooLong = mottoWords > MAX_MOTTO_WORDS;

  const set = (field: keyof ProfileInfoInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (mottoTooLong) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfileInfo(form);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar información" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Input
          id="profile-whatsapp"
          label="Teléfono celular"
          type="tel"
          value={form.whatsapp}
          onChange={set("whatsapp")}
        />
        <Input
          id="profile-secondary-email"
          label="Segundo correo electrónico"
          type="email"
          value={form.secondaryEmail}
          onChange={set("secondaryEmail")}
        />
        <Input
          id="profile-address"
          label="Dirección"
          value={form.address}
          onChange={set("address")}
        />
        <Input
          id="profile-company"
          label="Empresa"
          value={form.company}
          onChange={set("company")}
        />
        <Input
          id="profile-brand"
          label="Marca"
          value={form.brand}
          onChange={set("brand")}
        />
        <Input
          id="profile-motto"
          label="Lema"
          value={form.motto}
          onChange={set("motto")}
          error={mottoTooLong}
          errorMessage={`El lema no puede exceder ${MAX_MOTTO_WORDS} palabras.`}
          description={`${mottoWords}/${MAX_MOTTO_WORDS} palabras`}
        />

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSave}
            loading={saving}
            disabled={mottoTooLong}
          >
            Guardar cambios
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

// ─── Seguridad y privacidad ───────────────────────────────────────────────────
// Las herramientas de protección de la cuenta (contraseña, verificación en dos
// pasos, sesiones activas) viven en el panel de cuenta de Clerk; este diálogo
// explica la privacidad del perfil y abre ese panel.
export function SecurityPrivacyDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { openUserProfile } = useClerk();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seguridad y privacidad" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          title="Tu perfil es privado"
          description="Nadie más puede ver tu perfil de cliente, ni siquiera con el enlace directo. Tus diseñadores solo ven los proyectos y recursos que tú decidas compartir con ellos."
        />
        <Text variant="body-default-s" onBackground="neutral-weak">
          Protege tu cuenta desde el panel de seguridad: ahí puedes cambiar tu contraseña, activar la
          verificación en dos pasos y cerrar sesiones abiertas en otros dispositivos.
        </Text>
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="primary"
            size="m"
            prefixIcon="shield"
            onClick={() => {
              onClose();
              openUserProfile();
            }}
          >
            Abrir panel de seguridad
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}
