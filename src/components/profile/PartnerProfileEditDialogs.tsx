"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Column, Feedback, Modal, Row, Switch, Text } from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { updateCoverImage, updatePartnerVisibility } from "@/app/actions/updateProfile";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";

const MAX_COVER_BYTES = 4 * 1024 * 1024;
// Salida final de la portada (proporción ~3:1 como el banner del perfil)
const COVER_W = 1500;
const COVER_H = 500;
// La server action rechaza data URLs mayores: se baja la calidad hasta caber.
const MAX_COVER_DATA_URL_CHARS = 700_000;
const JPEG_QUALITIES = [0.82, 0.7, 0.55, 0.4];

const modalBackdrop = <BrandModalBackdrop />;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

// Encaje "cover" centrado de la imagen original en un canvas 1500×500 → data URL.
async function fileToCoverDataUrl(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.max(COVER_W / img.naturalWidth, COVER_H / img.naturalHeight);
    const srcW = COVER_W / scale;
    const srcH = COVER_H / scale;
    const srcX = (img.naturalWidth - srcW) / 2;
    const srcY = (img.naturalHeight - srcH) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = COVER_W;
    canvas.height = COVER_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, COVER_W, COVER_H);

    for (const quality of JPEG_QUALITIES) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_COVER_DATA_URL_CHARS) return dataUrl;
    }
    throw new Error("La imagen es demasiado pesada incluso comprimida.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (selected: File) => {
    setPreview(null);
    if (selected.size > MAX_COVER_BYTES) {
      setError("La imagen supera el máximo de 4MB permitido.");
      return;
    }
    setError(null);
    try {
      setPreview(await fileToCoverDataUrl(selected));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar la imagen.");
    }
  };

  const persist = async (dataUrl: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await updateCoverImage(dataUrl);
      setPreview(null);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la portada.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imagen de portada" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Sube únicamente imágenes libres de derechos de autor y sin contenido ofensivo. Máximo 4MB; la portada se recorta al centro en formato panorámico (1500 × 500 px)."
        />

        {preview ? (
          <Column gap="12" fillWidth horizontal="center">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL local, sin optimización posible */}
            <img
              src={preview}
              alt="Vista previa de la portada"
              style={{ width: "100%", borderRadius: "var(--radius-l)" }}
            />
            <Button variant="tertiary" size="s" onClick={() => setPreview(null)} disabled={saving}>
              Elegir otra imagen
            </Button>
          </Column>
        ) : (
          <MediaUpload
            aspectRatio="3 / 1"
            accept="image/*"
            compress
            resizeMaxWidth={2400}
            resizeMaxHeight={800}
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
          <Button variant="primary" size="m" onClick={() => persist(preview)} loading={saving} disabled={!preview}>
            Guardar portada
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
}: {
  isOpen: boolean;
  onClose: () => void;
  initialIsPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reabrir el modal debe partir del valor guardado, no del último toggle sin guardar.
  useEffect(() => {
    if (isOpen) setIsPublic(initialIsPublic);
  }, [isOpen, initialIsPublic]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updatePartnerVisibility(isPublic);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar información de perfil" backdrop={modalBackdrop}>
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
              Tu tarjeta aparece en Explorar / designerds. Si lo desactivas, tu
              perfil seguirá disponible buscándolo por nombre de usuario.
            </Text>
          </Column>
          <Switch
            isChecked={isPublic}
            onToggle={() => setIsPublic((v) => !v)}
            ariaLabel="Mantener mi perfil público en Explorar"
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
