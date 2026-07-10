"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Checkbox,
  Column,
  Feedback,
  Heading,
  Icon,
  IconButton,
  Input,
  Line,
  Modal,
  ProgressBar,
  Row,
  Select,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import type { CollabLink, CollabProjectData, ProjectAssetData, ProjectAssetTaskData } from "@/lib/collab";
import { validateExternalUrl } from "@/lib/externalLink";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { addProjectLink, deleteProjectLink, updateCollabProject } from "@/app/actions/collab";
import type { AssetCategoryData } from "@/app/actions/projectAssets";
import {
  addCustomProjectAsset,
  addProjectAsset,
  addProjectAssetTask,
  deleteProjectAsset,
  deleteProjectAssetTask,
  renameProjectAsset,
  toggleProjectAssetTask,
} from "@/app/actions/projectAssets";

type ViewerRole = "client" | "partner";

interface CollabPersonSummary {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
}

interface CollabProjectViewProps {
  project: CollabProjectData;
  client: CollabPersonSummary;
  partner: CollabPersonSummary;
  viewerRole: ViewerRole;
  viewerId: string;
  assetCatalog: AssetCategoryData[];
}

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

const PROJECT_STATUS_VARIANTS: Record<string, "neutral" | "warning" | "success"> = {
  active: "warning",
  completed: "success",
  archived: "neutral",
};

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "completed", label: "Completado" },
  { value: "archived", label: "Archivado" },
];

const PROVIDER_LABELS: Record<string, string> = {
  drive: "Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  wetransfer: "WeTransfer",
  other: "Link",
};

const modalBackdrop = <BrandModalBackdrop />;

function PersonBadge({ label, person }: { label: string; person: CollabPersonSummary }) {
  const initials = (person.name?.[0] ?? person.username?.[0] ?? "U").toUpperCase();

  return (
    <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
      <Avatar size="s" {...(person.imageUrl ? { src: person.imageUrl } : { value: initials })} />
      <Column gap="2" style={{ minWidth: 0 }}>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {label}
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {person.name ?? person.username ?? "Sin nombre"}
        </Text>
      </Column>
      {person.username && (
        <IconButton
          icon="person"
          size="s"
          variant="tertiary"
          href={`/${person.username}`}
          tooltip="Ver perfil"
          tooltipPosition="top"
        />
      )}
    </Row>
  );
}

function LinkRow({
  link,
  canDelete,
  busy,
  onDelete,
}: {
  link: CollabLink;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
}) {
  return (
    <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" gap="16" wrap>
      <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
        <Icon name="attach" size="s" onBackground="neutral-weak" />
        <Text
          variant="label-default-m"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {link.label}
        </Text>
      </Row>

      <Row gap="8" vertical="center">
        <Tag size="s" variant="neutral" label={PROVIDER_LABELS[link.provider] ?? "Link"} />
        <IconButton
          icon="arrowUpRightFromSquare"
          size="s"
          variant="tertiary"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          tooltip="Abrir en nueva pestaña"
          tooltipPosition="top"
        />
        {canDelete && (
          <IconButton
            icon="trash"
            size="s"
            variant="tertiary"
            tooltip="Eliminar link"
            tooltipPosition="top"
            loading={busy}
            disabled={busy}
            onClick={onDelete}
          />
        )}
      </Row>
    </Row>
  );
}

function ProjectSettingsDialog({
  isOpen,
  onClose,
  project,
  viewerRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: CollabProjectData;
  viewerRole: ViewerRole;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState(project.status);
  const [clientNotes, setClientNotes] = useState(project.clientNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateCollabProject(project.id, {
      title,
      description,
      status,
      ...(viewerRole === "client" ? { clientNotes } : {}),
    });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración del proyecto" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Input id="collab-project-title" label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          id="collab-project-description"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          lines={3}
        />
        <Select
          id="collab-project-status"
          label="Estatus"
          value={status}
          onSelect={(value) => setStatus(value as string)}
          options={PROJECT_STATUS_OPTIONS}
        />
        {viewerRole === "client" && (
          <Textarea
            id="collab-project-client-notes"
            label="Tus notas"
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
            lines={3}
            description="Notas privadas del proyecto, solo visibles para ti."
          />
        )}

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

function AssetTaskRow({
  task,
  canEdit,
}: {
  task: ProjectAssetTaskData;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleToggle = async () => {
    setBusy(true);
    const result = await toggleProjectAssetTask(task.id, !task.done);
    setBusy(false);
    if (result.ok) router.refresh();
  };

  const handleDelete = async () => {
    setBusy(true);
    const result = await deleteProjectAssetTask(task.id);
    setBusy(false);
    if (result.ok) router.refresh();
  };

  return (
    <Row fillWidth paddingX="16" paddingY="8" horizontal="between" vertical="center" gap="12" wrap>
      <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
        <Checkbox isChecked={task.done} onToggle={handleToggle} disabled={busy} />
        <Text
          variant="label-default-s"
          onBackground={task.done ? "neutral-weak" : "neutral-strong"}
          style={{
            minWidth: 0,
            overflowWrap: "anywhere",
            textDecoration: task.done ? "line-through" : undefined,
          }}
        >
          {task.title}
        </Text>
      </Row>
      {canEdit && (
        <IconButton
          icon="trash"
          size="s"
          variant="tertiary"
          tooltip="Eliminar tarea"
          tooltipPosition="top"
          loading={busy}
          disabled={busy}
          onClick={handleDelete}
        />
      )}
    </Row>
  );
}

function AssetCard({ asset, viewerRole }: { asset: ProjectAssetData; viewerRole: ViewerRole }) {
  const router = useRouter();
  const isPartner = viewerRole === "partner";

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(asset.title);
  const [savingTitle, setSavingTitle] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const total = asset.tasks.length;
  const done = asset.tasks.filter((task) => task.done).length;

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === asset.title) {
      setEditingTitle(false);
      setTitleDraft(asset.title);
      return;
    }
    setSavingTitle(true);
    setError(null);
    const result = await renameProjectAsset(asset.id, titleDraft);
    setSavingTitle(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingTitle(false);
    router.refresh();
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    setError(null);
    const result = await addProjectAssetTask(asset.id, newTaskTitle);
    setAddingTask(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewTaskTitle("");
    router.refresh();
  };

  const handleDeleteAsset = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeletingAsset(true);
    setError(null);
    const result = await deleteProjectAsset(asset.id);
    setDeletingAsset(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <Column fillWidth border="neutral-alpha-medium" radius="l" padding="16" gap="12">
      <Row fillWidth horizontal="between" vertical="center" gap="12" wrap>
        <Row gap="8" vertical="center" style={{ minWidth: 0, flex: 1 }}>
          {editingTitle ? (
            <>
              <Column style={{ flex: 1, minWidth: 160 }}>
                <Input
                  id={`asset-title-${asset.id}`}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setEditingTitle(false);
                      setTitleDraft(asset.title);
                    }
                  }}
                />
              </Column>
              <IconButton
                icon="check"
                size="s"
                variant="tertiary"
                tooltip="Guardar"
                tooltipPosition="top"
                loading={savingTitle}
                disabled={savingTitle}
                onClick={handleSaveTitle}
              />
              <IconButton
                icon="xCircle"
                size="s"
                variant="tertiary"
                tooltip="Cancelar"
                tooltipPosition="top"
                disabled={savingTitle}
                onClick={() => {
                  setEditingTitle(false);
                  setTitleDraft(asset.title);
                }}
              />
            </>
          ) : (
            <>
              <Text
                variant="heading-strong-s"
                onBackground="neutral-strong"
                style={{ minWidth: 0, overflowWrap: "anywhere" }}
              >
                {asset.title}
              </Text>
              {isPartner && (
                <IconButton
                  icon="edit"
                  size="s"
                  variant="tertiary"
                  tooltip="Renombrar activo"
                  tooltipPosition="top"
                  onClick={() => setEditingTitle(true)}
                />
              )}
            </>
          )}
        </Row>

        <Row gap="8" vertical="center">
          {total > 0 && (
            <Tag size="s" variant={done === total ? "success" : "neutral"} label={`${done}/${total}`} />
          )}
          {isPartner && (
            <IconButton
              icon="trash"
              size="s"
              variant={confirmDelete ? "danger" : "tertiary"}
              tooltip={confirmDelete ? "Confirmar eliminación" : "Eliminar activo"}
              tooltipPosition="top"
              loading={deletingAsset}
              disabled={deletingAsset}
              onClick={handleDeleteAsset}
            />
          )}
          {confirmDelete && isPartner && (
            <IconButton
              icon="xCircle"
              size="s"
              variant="tertiary"
              tooltip="Cancelar"
              tooltipPosition="top"
              disabled={deletingAsset}
              onClick={() => setConfirmDelete(false)}
            />
          )}
        </Row>
      </Row>

      {error && <Feedback variant="danger" description={error} onClose={() => setError(null)} showCloseButton fillWidth />}

      {asset.tasks.length > 0 && (
        <Column fillWidth border="neutral-alpha-weak" radius="m" overflow="hidden">
          {asset.tasks.map((task, index) => (
            <Column key={task.id} fillWidth>
              {index > 0 && <Line background="neutral-alpha-weak" />}
              <AssetTaskRow task={task} canEdit={isPartner} />
            </Column>
          ))}
        </Column>
      )}

      {isPartner && (
        <Row fillWidth gap="8" vertical="end" wrap>
          <Column style={{ flex: 1, minWidth: 160 }}>
            <Input
              id={`asset-new-task-${asset.id}`}
              label="Nueva tarea del checklist"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Ej. Enviar boceto inicial"
            />
          </Column>
          <Button
            variant="secondary"
            size="s"
            prefixIcon="plus"
            onClick={handleAddTask}
            loading={addingTask}
            disabled={!newTaskTitle.trim()}
          >
            Agregar tarea
          </Button>
        </Row>
      )}
    </Column>
  );
}

function AddAssetModal({
  isOpen,
  onClose,
  projectId,
  assetCatalog,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  assetCatalog: AssetCategoryData[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [categoryId, setCategoryId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = assetCatalog.find((category) => category.id === categoryId);

  const handleClose = () => {
    if (saving) return;
    setMode("template");
    setCategoryId("");
    setTemplateId("");
    setCustomTitle("");
    setError(null);
    onClose();
  };

  const handleAddFromTemplate = async () => {
    if (!templateId) return;
    setSaving(true);
    setError(null);
    const result = await addProjectAsset(projectId, templateId);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    handleClose();
  };

  const handleAddCustom = async () => {
    if (!customTitle.trim()) return;
    setSaving(true);
    setError(null);
    const result = await addCustomProjectAsset(projectId, customTitle);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agregar activo" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Row gap="8">
          <Button
            variant={mode === "template" ? "primary" : "secondary"}
            size="s"
            onClick={() => setMode("template")}
          >
            Desde catálogo
          </Button>
          <Button
            variant={mode === "custom" ? "primary" : "secondary"}
            size="s"
            onClick={() => setMode("custom")}
          >
            Activo personalizado
          </Button>
        </Row>

        {mode === "template" ? (
          <>
            <Select
              id="asset-category"
              label="Categoría"
              value={categoryId}
              onSelect={(value) => {
                setCategoryId(value as string);
                setTemplateId("");
              }}
              options={assetCatalog.map((category) => ({ value: category.id, label: category.name }))}
            />
            <Select
              id="asset-template"
              label="Activo"
              value={templateId}
              onSelect={(value) => setTemplateId(value as string)}
              disabled={!selectedCategory}
              options={
                selectedCategory?.templates.map((template) => ({ value: template.id, label: template.name })) ?? []
              }
            />
          </>
        ) : (
          <Input
            id="asset-custom-title"
            label="Título del activo"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Ej. Guión de video"
          />
        )}

        {error && <Feedback variant="danger" description={error} />}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          {mode === "template" ? (
            <Button variant="primary" size="m" onClick={handleAddFromTemplate} loading={saving} disabled={!templateId}>
              Agregar
            </Button>
          ) : (
            <Button variant="primary" size="m" onClick={handleAddCustom} loading={saving} disabled={!customTitle.trim()}>
              Agregar
            </Button>
          )}
        </Row>
      </Column>
    </Modal>
  );
}

export function CollabProjectView({ project, client, partner, viewerRole, viewerId, assetCatalog }: CollabProjectViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  const handleAddLink = async () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    if (!validateExternalUrl(linkUrl)) {
      setLinkError("La URL no es válida.");
      return;
    }
    setLinkError(null);
    setAddingLink(true);
    setError(null);
    const result = await addProjectLink(project.id, linkLabel, linkUrl);
    if (!result.ok) {
      setError(result.error);
    } else {
      setLinkLabel("");
      setLinkUrl("");
      router.refresh();
    }
    setAddingLink(false);
  };

  const handleDeleteLink = async (linkId: string) => {
    setBusyLinkId(linkId);
    setError(null);
    const result = await deleteProjectLink(linkId);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusyLinkId(null);
  };

  const totalAssetTasks = project.assets.reduce((sum, asset) => sum + asset.tasks.length, 0);
  const doneAssetTasks = project.assets.reduce(
    (sum, asset) => sum + asset.tasks.filter((task) => task.done).length,
    0,
  );
  const assetProgressPercent = totalAssetTasks > 0 ? Math.round((doneAssetTasks / totalAssetTasks) * 100) : 0;

  return (
    <Column fillWidth maxWidth="l" horizontal="center" paddingX="32" paddingTop="40" paddingBottom="80" gap="24">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="16" fillWidth>
        <Row fillWidth gap="16" horizontal="between" vertical="start" wrap>
          <Column gap="8" style={{ minWidth: 0 }}>
            <Row gap="8" vertical="center" wrap>
              <Heading variant="heading-strong-l" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                {project.title}
              </Heading>
              <Tag
                size="m"
                variant={PROJECT_STATUS_VARIANTS[project.status] ?? "neutral"}
                label={PROJECT_STATUS_LABELS[project.status] ?? project.status}
              />
            </Row>
            {project.description && (
              <Text
                variant="body-default-m"
                onBackground="neutral-weak"
                style={{ minWidth: 0, overflowWrap: "anywhere" }}
              >
                {project.description}
              </Text>
            )}
          </Column>
          <IconButton
            icon="settings"
            size="m"
            variant="tertiary"
            tooltip="Configuración del proyecto"
            tooltipPosition="left"
            onClick={() => setSettingsOpen(true)}
          />
        </Row>

        <Line background="neutral-alpha-weak" />

        <Row gap="24" wrap>
          <PersonBadge label="Cliente" person={client} />
          <PersonBadge label="Partner" person={partner} />
        </Row>

        {viewerRole === "client" && project.clientNotes && (
          <Column background="neutral-alpha-weak" padding="12" radius="m" gap="4">
            <Text variant="label-strong-s">Tus notas</Text>
            <Text variant="body-default-s" onBackground="neutral-weak" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {project.clientNotes}
            </Text>
          </Column>
        )}
      </Column>

      {error && <Feedback variant="danger" description={error} onClose={() => setError(null)} showCloseButton fillWidth />}

      {/* ── Activos del proyecto ─────────────────────────────────────────── */}
      <Column gap="16" fillWidth>
        <Row fillWidth horizontal="between" vertical="center">
          <Heading variant="heading-strong-m">Activos del proyecto</Heading>
          <Text variant="label-default-s" onBackground="neutral-weak">
            {project.assets.length} {project.assets.length === 1 ? "activo" : "activos"}
          </Text>
        </Row>

        {totalAssetTasks > 0 && (
          <Column gap="8" fillWidth>
            <ProgressBar value={assetProgressPercent} label={false} />
            <Text variant="label-default-s" onBackground="neutral-weak" align="center">
              {doneAssetTasks} de {totalAssetTasks} completados ({assetProgressPercent}%)
            </Text>
          </Column>
        )}

        {project.assets.length === 0 ? (
          <Column
            fillWidth
            horizontal="center"
            gap="12"
            padding="32"
            border="neutral-alpha-medium"
            radius="l"
          >
            <Icon name="sparkles" size="l" onBackground="neutral-weak" />
            <Text variant="body-default-m" onBackground="neutral-weak" align="center">
              Aún no hay activos en este proyecto.
            </Text>
          </Column>
        ) : (
          <Column gap="12" fillWidth>
            {project.assets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} viewerRole={viewerRole} />
            ))}
          </Column>
        )}

        {viewerRole === "partner" && (
          <Row fillWidth horizontal="end">
            <Button variant="secondary" size="m" prefixIcon="plus" onClick={() => setAddAssetOpen(true)}>
              Agregar activo
            </Button>
          </Row>
        )}
      </Column>

      {/* ── Archivos ─────────────────────────────────────────────────────── */}
      <Column gap="16" fillWidth>
        <Heading variant="heading-strong-m">Archivos del proyecto</Heading>

        <Feedback
          variant="info"
          description="Aquí no se guardan archivos pesados: sube tus materiales a tu servicio de nube (Google Drive, Dropbox, OneDrive, WeTransfer...) con permisos de acceso para compartir, y pega el link abajo."
        />

        {project.links.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            Todavía no se han compartido archivos.
          </Text>
        ) : (
          <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
            {project.links.map((link, index) => (
              <Column key={link.id} fillWidth>
                {index > 0 && <Line background="neutral-alpha-weak" />}
                <LinkRow
                  link={link}
                  canDelete={viewerRole === "client" || link.addedById === viewerId}
                  busy={busyLinkId === link.id}
                  onDelete={() => handleDeleteLink(link.id)}
                />
              </Column>
            ))}
          </Column>
        )}

        <Column gap="8" fillWidth>
          <Row fillWidth gap="8" wrap>
            <Column style={{ flex: 1, minWidth: 160 }}>
              <Input
                id="collab-new-link-label"
                label="Etiqueta"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="Ej. Fotos finales"
              />
            </Column>
            <Column style={{ flex: 2, minWidth: 220 }}>
              <Input
                id="collab-new-link-url"
                label="URL"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkError(null);
                }}
                placeholder="https://drive.google.com/..."
                error={Boolean(linkError)}
                errorMessage={linkError ?? undefined}
              />
            </Column>
          </Row>
          <Row fillWidth horizontal="end">
            <Button
              variant="secondary"
              size="m"
              prefixIcon="plus"
              onClick={handleAddLink}
              loading={addingLink}
              disabled={!linkLabel.trim() || !linkUrl.trim()}
            >
              Agregar link
            </Button>
          </Row>
        </Column>
      </Column>

      <ProjectSettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        project={project}
        viewerRole={viewerRole}
      />

      <AddAssetModal
        isOpen={addAssetOpen}
        onClose={() => setAddAssetOpen(false)}
        projectId={project.id}
        assetCatalog={assetCatalog}
      />
    </Column>
  );
}
