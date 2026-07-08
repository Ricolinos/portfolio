"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarGroup,
  BlobFx,
  Button,
  Column,
  CompareImage,
  DropdownWrapper,
  Feedback,
  Icon,
  IconButton,
  Input,
  Media,
  Modal,
  Option,
  Row,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { MediaUpload } from "@once-ui-system/core/modules";
import {
  createCaseStudy,
  searchCollaborators,
  uploadCaseStudyMedia,
} from "@/app/actions/caseStudies";
import {
  countSections,
  MAX_CAROUSEL_IMAGES,
  SECTION_LABELS,
  SECTION_LIMITS,
  type CaseStudySection,
  type CollaboratorRef,
  type SectionKind,
} from "@/lib/caseStudyBuilder";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// Estado de edición de cada sección; al publicar se proyecta a CaseStudySection.
type BuilderSection =
  | { id: string; kind: "titulo" | "subtitulo" | "texto"; text: string }
  | { id: string; kind: "portada"; src: string | null }
  | { id: string; kind: "carousel"; images: string[] }
  | { id: string; kind: "comparador"; left: string | null; right: string | null }
  | { id: string; kind: "colaboradores"; selected: CollaboratorRef[] };

const SECTION_ICONS: Record<SectionKind, string> = {
  titulo: "edit",
  subtitulo: "edit",
  texto: "document",
  portada: "gallery",
  carousel: "images",
  comparador: "eye",
  colaboradores: "userGroup",
};

function newSection(kind: SectionKind): BuilderSection {
  const id = crypto.randomUUID();
  switch (kind) {
    case "titulo":
    case "subtitulo":
    case "texto":
      return { id, kind, text: "" };
    case "portada":
      return { id, kind, src: null };
    case "carousel":
      return { id, kind, images: [] };
    case "comparador":
      return { id, kind, left: null, right: null };
    case "colaboradores":
      return { id, kind, selected: [] };
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function CreateCaseStudyDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [sections, setSections] = useState<BuilderSection[]>([
    newSection("titulo"),
    newSection("portada"),
  ]);
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Subidas de imagen en vuelo: bloquean el botón de publicar
  const [busy, setBusy] = useState(0);

  const counts = countSections(sections as unknown as CaseStudySection[]);

  const update = (id: string, patch: Partial<BuilderSection>) =>
    setSections((prev) =>
      prev.map((s) => (s.id === id ? ({ ...s, ...patch } as BuilderSection) : s)),
    );

  const remove = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id));

  const move = (index: number, delta: -1 | 1) =>
    setSections((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addSection = (kind: SectionKind) => {
    if (counts[kind] >= SECTION_LIMITS[kind]) return;
    setSections((prev) => [...prev, newSection(kind)]);
    setMenuOpen(false);
  };

  // Sube la imagen al seleccionarla y devuelve su URL /api/media/<id>.
  const upload = async (file: File): Promise<string | null> => {
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen supera el máximo de 4MB.");
      return null;
    }
    setBusy((b) => b + 1);
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { url } = await uploadCaseStudyMedia(dataUrl, file.name);
      return url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
      return null;
    } finally {
      setBusy((b) => b - 1);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const draft: CaseStudySection[] = [];
      for (const s of sections) {
        switch (s.kind) {
          case "titulo":
          case "subtitulo":
          case "texto":
            draft.push({ kind: s.kind, text: s.text });
            break;
          case "portada":
            if (!s.src) throw new Error("Falta la imagen de portada.");
            draft.push({ kind: "portada", src: s.src });
            break;
          case "carousel":
            if (s.images.length === 0)
              throw new Error("Hay un carousel sin imágenes.");
            draft.push({ kind: "carousel", images: s.images });
            break;
          case "comparador":
            if (!s.left || !s.right)
              throw new Error("Hay un comparador al que le falta una imagen.");
            draft.push({ kind: "comparador", left: s.left, right: s.right });
            break;
          case "colaboradores":
            if (s.selected.length > 0)
              draft.push({
                kind: "colaboradores",
                usernames: s.selected.map((c) => c.username),
              });
            break;
        }
      }

      const { href } = await createCaseStudy({ category, isPublic, sections: draft });
      onClose();
      router.refresh();
      if (isPublic) router.push(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo proyecto"
      backdrop={<BlobFx position="absolute" fill seed={42} />}
    >
      <Column gap="16" fillWidth paddingTop="12">
        <Feedback
          variant="info"
          description="Arma tu caso de estudio por secciones con el botón «Añadir sección»; el orden en que las acomodes será el orden final de la publicación."
        />

        <Input
          id="case-study-category"
          label="Categoría (Branding, Motion, Web…)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <Column
          gap="12"
          fillWidth
          style={{ maxHeight: "50vh", overflowY: "auto" }}
          paddingRight="4"
        >
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onUpdate={update}
              onRemove={remove}
              onMove={move}
              upload={upload}
              setError={setError}
            />
          ))}
        </Column>

        <DropdownWrapper
          isOpen={menuOpen}
          onOpenChange={setMenuOpen}
          closeAfterClick
          trigger={
            <Button variant="secondary" size="m" prefixIcon="plus">
              Añadir sección
            </Button>
          }
          dropdown={
            <Column padding="4" gap="2" minWidth={14}>
              {(Object.keys(SECTION_LIMITS) as SectionKind[]).map((kind) => (
                <Option
                  key={kind}
                  value={kind}
                  label={SECTION_LABELS[kind]}
                  hasPrefix={<Icon name={SECTION_ICONS[kind]} size="s" />}
                  description={`${counts[kind]}/${SECTION_LIMITS[kind]}`}
                  disabled={counts[kind] >= SECTION_LIMITS[kind]}
                  onClick={(value) => addSection(value as SectionKind)}
                />
              ))}
            </Column>
          }
        />

        <Row
          fillWidth
          padding="12"
          radius="m"
          border="neutral-alpha-weak"
          background="neutral-alpha-weak"
          horizontal="between"
          vertical="center"
          gap="16"
        >
          <Column gap="2">
            <Text variant="label-strong-s">
              {isPublic ? "Proyecto público" : "Borrador privado"}
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {isPublic
                ? "Visible en tu perfil, en Explorar y en la Home."
                : "Solo tú lo verás en tu perfil hasta que lo publiques."}
            </Text>
          </Column>
          <Switch
            id="case-study-visibility"
            isChecked={isPublic}
            onToggle={() => setIsPublic((v) => !v)}
            ariaLabel="Proyecto público"
          />
        </Row>

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSubmit}
            loading={saving}
            disabled={busy > 0}
          >
            {isPublic ? "Publicar proyecto" : "Guardar borrador"}
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

// ─── Editor de cada sección ───────────────────────────────────────────────────
function SectionEditor({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  upload,
  setError,
}: {
  section: BuilderSection;
  index: number;
  total: number;
  onUpdate: (id: string, patch: Partial<BuilderSection>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  upload: (file: File) => Promise<string | null>;
  setError: (message: string | null) => void;
}) {
  return (
    <Column fillWidth padding="12" radius="m" border="neutral-alpha-weak" gap="12">
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="8" vertical="center">
          <Icon name={SECTION_ICONS[section.kind]} size="s" onBackground="neutral-weak" />
          <Text variant="label-strong-s">{SECTION_LABELS[section.kind]}</Text>
        </Row>
        <Row gap="2">
          <IconButton
            icon="chevronUp"
            size="s"
            variant="tertiary"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            tooltip="Subir"
          />
          <IconButton
            icon="chevronDown"
            size="s"
            variant="tertiary"
            disabled={index === total - 1}
            onClick={() => onMove(index, 1)}
            tooltip="Bajar"
          />
          <IconButton
            icon="trash"
            size="s"
            variant="tertiary"
            onClick={() => onRemove(section.id)}
            tooltip="Eliminar sección"
          />
        </Row>
      </Row>

      {(section.kind === "titulo" || section.kind === "subtitulo") && (
        <Input
          id={`section-${section.id}`}
          label={section.kind === "titulo" ? "Título del proyecto" : "Subtítulo"}
          value={section.text}
          onChange={(e) => onUpdate(section.id, { text: e.target.value })}
        />
      )}

      {section.kind === "texto" && (
        <Textarea
          id={`section-${section.id}`}
          label="Descripción del proyecto"
          lines={4}
          value={section.text}
          onChange={(e) => onUpdate(section.id, { text: e.target.value })}
        />
      )}

      {section.kind === "portada" && (
        <MediaUpload
          aspectRatio="16 / 9"
          accept="image/*"
          compress
          resizeMaxWidth={1600}
          resizeMaxHeight={1600}
          emptyState="Arrastra una imagen o GIF, o haz click para buscar"
          onFileUpload={async (file) => {
            const url = await upload(file);
            onUpdate(section.id, { src: url });
          }}
        />
      )}

      {section.kind === "carousel" && (
        <Column gap="8" fillWidth>
          {section.images.length > 0 && (
            <Row gap="8" wrap>
              {section.images.map((src, i) => (
                <Row key={src} style={{ position: "relative", width: 104 }}>
                  <Media src={src} alt={`Imagen ${i + 1}`} aspectRatio="4 / 3" radius="s" unoptimized />
                  <Row style={{ position: "absolute", top: 2, right: 2 }}>
                    <IconButton
                      icon="close"
                      size="s"
                      variant="primary"
                      tooltip="Quitar imagen"
                      onClick={() =>
                        onUpdate(section.id, {
                          images: section.images.filter((img) => img !== src),
                        })
                      }
                    />
                  </Row>
                </Row>
              ))}
            </Row>
          )}
          {section.images.length < MAX_CAROUSEL_IMAGES && (
            <MediaUpload
              // Remount tras cada subida: limpia el preview interno para la siguiente
              key={section.images.length}
              aspectRatio="16 / 9"
              accept="image/*"
              compress
              resizeMaxWidth={1600}
              resizeMaxHeight={1600}
              emptyState={`Añadir imagen ${section.images.length + 1} de ${MAX_CAROUSEL_IMAGES}`}
              onFileUpload={async (file) => {
                const url = await upload(file);
                if (url) onUpdate(section.id, { images: [...section.images, url] });
              }}
            />
          )}
        </Column>
      )}

      {section.kind === "comparador" &&
        (section.left && section.right ? (
          <Column gap="8" fillWidth>
            <CompareImage
              radius="m"
              overflow="hidden"
              aspectRatio="16 / 9"
              leftContent={{ src: section.left, alt: "Antes" }}
              rightContent={{ src: section.right, alt: "Después" }}
            />
            <Row horizontal="end">
              <Button
                variant="tertiary"
                size="s"
                onClick={() => onUpdate(section.id, { left: null, right: null })}
              >
                Cambiar imágenes
              </Button>
            </Row>
          </Column>
        ) : (
          <Row gap="8" fillWidth s={{ direction: "column" }}>
            <Column gap="4" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                Antes
              </Text>
              <MediaUpload
                key={section.left ?? "left"}
                aspectRatio="16 / 9"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                emptyState="Imagen izquierda"
                onFileUpload={async (file) => {
                  const url = await upload(file);
                  if (url) onUpdate(section.id, { left: url });
                }}
              />
            </Column>
            <Column gap="4" fillWidth>
              <Text variant="label-default-s" onBackground="neutral-weak">
                Después
              </Text>
              <MediaUpload
                key={section.right ?? "right"}
                aspectRatio="16 / 9"
                accept="image/*"
                compress
                resizeMaxWidth={1600}
                resizeMaxHeight={1600}
                emptyState="Imagen derecha"
                onFileUpload={async (file) => {
                  const url = await upload(file);
                  if (url) onUpdate(section.id, { right: url });
                }}
              />
            </Column>
          </Row>
        ))}

      {section.kind === "colaboradores" && (
        <CollaboratorPicker
          selected={section.selected}
          onChange={(selected) => onUpdate(section.id, { selected })}
          setError={setError}
        />
      )}
    </Column>
  );
}

// ─── Selección de colaboradores por nombre de usuario ─────────────────────────
function CollaboratorPicker({
  selected,
  onChange,
  setError,
}: {
  selected: CollaboratorRef[];
  onChange: (selected: CollaboratorRef[]) => void;
  setError: (message: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CollaboratorRef[]>([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchCollaborators(term));
      } catch {
        setError("No se pudo buscar usuarios. Intenta de nuevo.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, setError]);

  const add = (user: CollaboratorRef) => {
    if (!selected.some((c) => c.username === user.username)) {
      onChange([...selected, user]);
    }
    setQuery("");
    setResults([]);
  };

  return (
    <Column gap="12" fillWidth>
      {selected.length > 0 && (
        <Row gap="12" vertical="center" wrap>
          <AvatarGroup
            size="s"
            avatars={selected.map((c) =>
              c.imageUrl
                ? { src: c.imageUrl }
                : { value: (c.name ?? c.username)[0]?.toUpperCase() ?? "?" },
            )}
          />
          <Row gap="4" wrap>
            {selected.map((c) => (
              <Button
                key={c.username}
                variant="secondary"
                size="s"
                suffixIcon="close"
                onClick={() => onChange(selected.filter((s) => s.username !== c.username))}
              >
                @{c.username}
              </Button>
            ))}
          </Row>
        </Row>
      )}

      <Input
        id="collaborator-search"
        label="Buscar por nombre de usuario"
        hasPrefix={<Icon name="search" size="xs" />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {searching && (
        <Text variant="body-default-xs" onBackground="neutral-weak">
          Buscando…
        </Text>
      )}
      {results.length > 0 && (
        <Column gap="2" fillWidth radius="m" border="neutral-alpha-weak" padding="4">
          {results.map((user) => (
            <Option
              key={user.username}
              value={user.username}
              label={`@${user.username}`}
              description={user.name ?? undefined}
              hasPrefix={
                <Avatar
                  size="s"
                  {...(user.imageUrl
                    ? { src: user.imageUrl }
                    : { value: (user.name ?? user.username)[0]?.toUpperCase() ?? "?" })}
                />
              }
              onClick={() => add(user)}
            />
          ))}
        </Column>
      )}
    </Column>
  );
}
