"use client";

import { Column, Icon, IconButton, Row, Spinner, Text } from "@once-ui-system/core";
import type React from "react";
import { useRef, useState } from "react";
import { readFileAsDataUrl } from "@/lib/files";
import { MAX_VIDEO_FILE_BYTES, VIDEO_UPLOAD_HELP_TEXT, validateVideoFile } from "@/lib/videoUpload";

interface VideoFileDropzoneProps {
  // data URL del video ya subido ("data:video/mp4;base64,...") o "" si no
  // hay ninguno todavía.
  value: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
  aspectRatio?: string;
}

// Mismo patrón que el `Dropzone` local de AttachFilesModal.tsx (Once UI puro
// + un <input type="file"> nativo oculto disparado por click en un `Column
// role="button"`): el módulo `MediaUpload` de Once UI rechaza en silencio
// cualquier archivo que no sea "image/*" (ver su propio `handleFiles` en
// dist/modules/media/MediaUpload.impl.js — solo hace `console.warn` y
// nunca llama a `onFileUpload`), así que no sirve para subir video. Este
// componente es la versión reutilizable de ese mismo patrón —usada en la
// portada por video (CreateProjectModal), el bloque "video" del cuerpo y
// las slides de video del bloque "Carousel" (ambos en ContentBlocks.tsx)—
// con las reglas de `lib/videoUpload.ts` (solo .mp4, <10MB) aplicadas ANTES
// de leer el archivo.
export function VideoFileDropzone({
  value,
  onChange,
  disabled,
  aspectRatio = "16 / 9",
}: VideoFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = Boolean(disabled) || uploading;

  const handleFile = async (file: File) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      onChange(await readFileAsDataUrl(file));
    } catch {
      setError("No se pudo subir el video. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  };

  const pick = () => {
    if (!busy) inputRef.current?.click();
  };

  return (
    <Column fillWidth gap="8">
      <Column
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        onClick={pick}
        onKeyDown={(e) => {
          if (!busy && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            pick();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) handleFile(file);
        }}
        fillWidth
        overflow="hidden"
        radius="l"
        border={dragActive ? "brand-medium" : "neutral-medium"}
        background={dragActive ? "brand-alpha-weak" : undefined}
        position="relative"
        style={{
          aspectRatio,
          borderStyle: value ? "solid" : "dashed",
          cursor: busy ? "default" : "pointer",
        }}
      >
        {value ? (
          // GOTCHA (ver lib/coverMedia.ts, isVideoDataUrl): `Media` (once-ui)
          // no reconoce "data:video/..." como video —su regex exige una
          // extensión .mp4 al final de la URL—, así que la previsualización
          // usa <video> nativo directo. `muted` porque `autoPlay` sin mute
          // lo bloquea el navegador.
          <video
            src={value}
            muted
            loop
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          >
            <track kind="captions" />
          </video>
        ) : (
          <Column fill horizontal="center" vertical="center" gap="8" padding="16">
            {uploading ? (
              <Spinner size="m" ariaLabel="Subiendo video" />
            ) : (
              <Icon name="film" size="l" onBackground="neutral-weak" />
            )}
            <Text variant="body-default-s" onBackground="neutral-weak" align="center">
              {uploading ? "Subiendo video…" : "Arrastra un video o haz click para buscar"}
            </Text>
          </Column>
        )}
        {value && !uploading && (
          <Row position="absolute" top="8" right="8">
            <IconButton
              icon="trash"
              variant="secondary"
              size="s"
              tooltip="Quitar video"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onChange("");
              }}
              disabled={busy}
            />
          </Row>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,.mp4"
          style={{ display: "none" }}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </Column>
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {VIDEO_UPLOAD_HELP_TEXT}
      </Text>
      {error && (
        <Text variant="body-default-xs" onBackground="danger-weak">
          {error}
        </Text>
      )}
    </Column>
  );
}

// Reexportado por si algún consumidor quiere mostrar el límite sin importar
// directo de lib/videoUpload.ts (ej. mensajes de error compuestos).
export { MAX_VIDEO_FILE_BYTES };
