"use client";

import { useClerk } from "@clerk/nextjs";
import {
  Avatar,
  Button,
  Chip,
  Column,
  Feedback,
  Heading,
  Icon,
  Input,
  Line,
  Modal,
  Row,
  Select,
  Slider,
  Switch,
  Text,
  Textarea,
  ToggleButton,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  updateDesignerCard,
  updateFeaturedImage,
  updatePartnerContactSharing,
  updatePartnerRoles,
  updatePartnerVisibility,
  type DesignerCardInput,
} from "@/app/actions/updateProfile";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { MAX_SECONDARY_ROLES, PARTNER_ROLES } from "@/lib/partnerRoles";
import { AppearancePanel } from "./AppearancePanel";

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

// ─── Encuadre arrastrable de la imagen destacada ─────────────────────────────
// Recorte arrastrable con zoom en formato vertical 3:4 (el mismo aspect ratio
// que la tarjeta Designerd en Explorar).
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

// ─── Editar información de perfil (Partner): general, tarjeta, visibilidad, seguridad ──
const PARTNER_EDIT_SECTIONS = [
  {
    key: "general",
    label: "General",
    icon: "infoCircle",
    description: "Tu identidad en la plataforma: imagen de perfil, nombre y usuario.",
  },
  {
    key: "tarjeta",
    label: "Tarjeta Designerd",
    icon: "gallery",
    description: "El contenido de tu tarjeta en Explorar / designerds.",
  },
  {
    key: "visibilidad",
    label: "Visibilidad",
    icon: "eye",
    description: "Quién puede ver tu perfil y tus datos de contacto.",
  },
  {
    key: "seguridad",
    label: "Seguridad",
    icon: "shield",
    description: "Protección de tu cuenta.",
  },
] as const;

type PartnerEditSectionKey = (typeof PARTNER_EDIT_SECTIONS)[number]["key"];

export function PartnerEditInfoDialog({
  isOpen,
  onClose,
  initialIsPublic,
  initialShareWhatsapp,
  initial,
  initialPrimaryRole,
  initialSecondaryRoles,
  avatarUrl,
  displayName,
  username,
  featuredImageUrl,
  onOpenAvatar,
  onOpenFeatured,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialIsPublic: boolean;
  initialShareWhatsapp: boolean;
  initial: DesignerCardInput;
  initialPrimaryRole?: string | null;
  initialSecondaryRoles?: string[];
  avatarUrl?: string;
  displayName: string;
  username: string;
  featuredImageUrl?: string | null;
  // Cierran este modal y abren el diálogo de recorte correspondiente.
  onOpenAvatar: () => void;
  onOpenFeatured: () => void;
}) {
  const router = useRouter();
  const { openUserProfile } = useClerk();
  const [section, setSection] = useState<PartnerEditSectionKey>("general");
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareWhatsapp, setShareWhatsapp] = useState(initialShareWhatsapp);
  const [form, setForm] = useState<DesignerCardInput>(initial);
  const [primaryRole, setPrimaryRole] = useState(initialPrimaryRole ?? "");
  const [secondaryRoles, setSecondaryRoles] = useState<string[]>(initialSecondaryRoles ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reabrir el modal debe partir del valor guardado, no de un borrador previo sin guardar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe reiniciar el formulario al abrir, no en cada cambio de props mientras el modal está abierto.
  useEffect(() => {
    if (isOpen) {
      setSection("general");
      setIsPublic(initialIsPublic);
      setShareWhatsapp(initialShareWhatsapp);
      setForm(initial);
      setPrimaryRole(initialPrimaryRole ?? "");
      setSecondaryRoles(initialSecondaryRoles ?? []);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tooLong =
    form.cardQuote.length > MAX_CARD_QUOTE_CHARS ||
    form.headline.length > MAX_HEADLINE_CHARS ||
    form.bio.length > MAX_BIO_CHARS;

  // Un rol secundario nunca puede repetir el principal recién elegido.
  const handlePrimaryRoleChange = (value: string) => {
    setPrimaryRole(value);
    setSecondaryRoles((current) => current.filter((role) => role !== value));
  };

  const toggleSecondaryRole = (role: string) => {
    setSecondaryRoles((current) => {
      if (current.includes(role)) return current.filter((r) => r !== role);
      if (current.length >= MAX_SECONDARY_ROLES) return current;
      return [...current, role];
    });
  };

  const handleSave = async () => {
    if (tooLong) return;
    setSaving(true);
    setError(null);
    try {
      await Promise.all([
        updatePartnerVisibility(isPublic),
        updatePartnerContactSharing(shareWhatsapp),
        updateDesignerCard(form),
        updatePartnerRoles({ primaryRole, secondaryRoles }),
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
        <Row fillWidth gap="24" vertical="start" s={{ direction: "column" }}>
          {/* ── Navegación lateral (escritorio): máx. 30% del ancho ── */}
          <Column
            gap="4"
            style={{ flex: "0 0 30%", maxWidth: "30%", minWidth: 0 }}
            s={{ hide: true }}
          >
            {PARTNER_EDIT_SECTIONS.map((s) => (
              <ToggleButton
                key={s.key}
                fillWidth
                horizontal="start"
                prefixIcon={s.icon}
                label={s.label}
                selected={section === s.key}
                onClick={() => setSection(s.key)}
              />
            ))}
          </Column>

          {/* ── Navegación móvil: solo iconos arriba, con indicador de activa ── */}
          <Row fillWidth gap="8" horizontal="center" hide s={{ hide: false }}>
            {PARTNER_EDIT_SECTIONS.map((s) => (
              <Column key={s.key} gap="4" horizontal="center">
                <ToggleButton
                  prefixIcon={s.icon}
                  selected={section === s.key}
                  onClick={() => setSection(s.key)}
                  aria-label={s.label}
                />
                {/* Indicador de sección activa */}
                <Line
                  background={section === s.key ? "brand-strong" : "transparent"}
                  style={{ width: 16, height: 2 }}
                />
              </Column>
            ))}
          </Row>

          <Line vert background="neutral-alpha-weak" style={{ alignSelf: "stretch" }} s={{ hide: true }} />

          {/* ── Contenido de la sección activa ── */}
          <Column gap="20" fillWidth style={{ minWidth: 0 }}>
            {(() => {
              const active = PARTNER_EDIT_SECTIONS.find((s) => s.key === section)!;
              return (
                <Column gap="4" fillWidth>
                  <Heading variant="heading-strong-m">{active.label}</Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {active.description}
                  </Text>
                </Column>
              );
            })()}
            <Line background="neutral-alpha-weak" />

            {section === "general" && (
              <Column gap="20" fillWidth>
                <Row gap="16" vertical="center" wrap>
                  <Avatar size="l" {...(avatarUrl ? { src: avatarUrl } : { value: (displayName[0] ?? "U").toUpperCase() })} />
                  <Column gap="2" style={{ minWidth: 0 }}>
                    <Text variant="label-strong-s">{displayName}</Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      @{username}
                    </Text>
                  </Column>
                  <Button size="s" variant="secondary" prefixIcon="camera" onClick={onOpenAvatar}>
                    Cambiar imagen
                  </Button>
                </Row>

                <Line background="neutral-alpha-weak" />

                <Column gap="12" fillWidth>
                  <Column gap="4">
                    <Text variant="label-strong-s">Roles</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Tu rol principal se destaca en tu perfil; elige hasta {MAX_SECONDARY_ROLES}{" "}
                      roles secundarios.
                    </Text>
                  </Column>

                  <Select
                    id="partner-primary-role"
                    label="Rol principal"
                    placeholder="Elige tu especialidad principal"
                    value={primaryRole}
                    onSelect={(value) => handlePrimaryRoleChange(value as string)}
                    options={PARTNER_ROLES.map((role) => ({ value: role, label: role }))}
                  />

                  <Column gap="8" fillWidth>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Roles secundarios ({secondaryRoles.length}/{MAX_SECONDARY_ROLES})
                    </Text>
                    <Row gap="8" wrap>
                      {PARTNER_ROLES.filter((role) => role !== primaryRole).map((role) => {
                        const selected = secondaryRoles.includes(role);
                        const disabled = !selected && secondaryRoles.length >= MAX_SECONDARY_ROLES;
                        return (
                          <Chip
                            key={role}
                            label={role}
                            selected={selected}
                            onClick={() => {
                              if (disabled) return;
                              toggleSecondaryRole(role);
                            }}
                            style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                          />
                        );
                      })}
                    </Row>
                  </Column>
                </Column>
              </Column>
            )}

            {section === "tarjeta" && (
              <Column gap="16" fillWidth>
                <Row gap="16" vertical="center" wrap>
                  <Column
                    radius="m"
                    overflow="hidden"
                    background="neutral-alpha-weak"
                    style={{ width: 56, height: 56, flexShrink: 0 }}
                    horizontal="center"
                    vertical="center"
                  >
                    {featuredImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura de vista previa
                      <img
                        src={featuredImageUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Icon name="gallery" size="m" onBackground="neutral-weak" />
                    )}
                  </Column>
                  <Button size="s" variant="secondary" prefixIcon="camera" onClick={onOpenFeatured}>
                    Cambiar imagen
                  </Button>
                </Row>

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
              </Column>
            )}

            {section === "visibilidad" && (
              <Column gap="12" fillWidth>
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
                      Tu tarjeta aparece en Explorar / designerds. Si lo desactivas, tu perfil
                      seguirá disponible buscándolo por nombre de usuario.
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
                      Solo lo verán usuarios registrados de la plataforma que visiten tu perfil.
                      Nunca se muestra a visitantes anónimos. Apagado por defecto.
                    </Text>
                  </Column>
                  <Switch
                    isChecked={shareWhatsapp}
                    onToggle={() => setShareWhatsapp((v) => !v)}
                    ariaLabel="Compartir mi WhatsApp con otros usuarios de la plataforma"
                  />
                </Row>
              </Column>
            )}

            {section === "seguridad" && (
              <Column gap="16" fillWidth>
                <Feedback
                  variant="info"
                  description="Tu perfil es público en Explorar / designerds salvo que lo desactives en la sección Visibilidad. Protege tu cuenta desde el panel de seguridad: ahí puedes cambiar tu contraseña, activar la verificación en dos pasos y cerrar sesiones abiertas en otros dispositivos."
                />
                <Row fillWidth>
                  <Button
                    variant="secondary"
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
            )}
          </Column>
        </Row>

        {/* Personalización de apariencia en el espacio inferior del modal */}
        <Line background="neutral-alpha-weak" />
        <AppearancePanel />

        {error && <Feedback variant="danger" description={error} />}

        <Line background="neutral-alpha-weak" />

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
