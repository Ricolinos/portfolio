"use client";

import { Avatar, Column, IconButton, Row, Text } from "@once-ui-system/core";
import { useRef, useState } from "react";
import { updateProjectLogo } from "@/app/actions/collab";

/* ══ Logotipo del proyecto (Fase 6b) ═══════════════════════════════════
   Extraído de CollabProjectView para reutilizarse también en el overlay de
   ajustes de proyecto de /mensajes (ConversationList). Sin bucket de
   Storage: se comprime a JPEG en el cliente y viaja como data URL, mismo
   patrón que la imagen destacada del perfil de partner. Recorte central
   cuadrado, un solo paso. `onSaved` la dispara el caller tras un cambio
   exitoso (router.refresh() en la página de proyecto, refetch del inbox
   en el messenger). ═══════════════════════════════════════════════════ */

const LOGO_SIDE = 256;
const LOGO_JPEG_QUALITIES = [0.82, 0.7, 0.55, 0.4];
// Debe caber bajo MAX_LOGO_DATA_URL_CHARS de updateProjectLogo (collab.ts).
const MAX_LOGO_DATA_URL_CHARS = 700_000;

function compressLogoCanvas(canvas: HTMLCanvasElement): string | null {
  for (const quality of LOGO_JPEG_QUALITIES) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_LOGO_DATA_URL_CHARS) return dataUrl;
  }
  return null;
}

export function ProjectLogoControl({
  projectId,
  logoUrl,
  title,
  canEdit,
  onSaved,
  size = "xl",
}: {
  projectId: string;
  logoUrl: string | null;
  title: string;
  canEdit: boolean;
  onSaved: () => void;
  size?: "xs" | "s" | "m" | "l" | "xl";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = (title[0] ?? "P").toUpperCase();

  const handleFile = (file: File) => {
    setError(null);
    setSaving(true);
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = LOGO_SIDE;
      canvas.height = LOGO_SIDE;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!ctx) {
        setError("No se pudo procesar la imagen.");
        setSaving(false);
        return;
      }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, LOGO_SIDE, LOGO_SIDE);
      const dataUrl = compressLogoCanvas(canvas);
      if (!dataUrl) {
        setError("La imagen es demasiado pesada incluso comprimida.");
        setSaving(false);
        return;
      }
      const result = await updateProjectLogo(projectId, dataUrl);
      setSaving(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError("No se pudo cargar la imagen.");
      setSaving(false);
    };
    img.src = objectUrl;
  };

  const handleRemove = async () => {
    setSaving(true);
    setError(null);
    const result = await updateProjectLogo(projectId, null);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  };

  return (
    <Column gap="4">
      <Row gap="8" vertical="center">
        <Avatar size={size} {...(logoUrl ? { src: logoUrl } : { value: initial })} />
        {canEdit && (
          <Column gap="4">
            <IconButton
              icon="camera"
              size="s"
              variant="tertiary"
              tooltip="Cambiar logotipo"
              tooltipPosition="top"
              loading={saving}
              disabled={saving}
              onClick={() => inputRef.current?.click()}
            />
            {logoUrl && (
              <IconButton
                icon="trash"
                size="s"
                variant="tertiary"
                tooltip="Quitar logotipo"
                tooltipPosition="top"
                loading={saving}
                disabled={saving}
                onClick={handleRemove}
              />
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              disabled={saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) handleFile(file);
              }}
            />
          </Column>
        )}
      </Row>
      {error && (
        <Text variant="label-default-s" onBackground="danger-weak">
          {error}
        </Text>
      )}
    </Column>
  );
}
