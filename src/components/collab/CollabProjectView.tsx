"use client";

import {
  Avatar,
  Button,
  Checkbox,
  Column,
  DateInput,
  Feedback,
  Heading,
  Icon,
  IconButton,
  Input,
  Line,
  Modal,
  NumberInput,
  ProgressBar,
  Row,
  Select,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  addProjectCollaborator,
  addProjectLink,
  deleteProjectLink,
  removeProjectCollaborator,
  updateCollabProject,
} from "@/app/actions/collab";
import type { AssetCategoryData } from "@/app/actions/projectAssets";
import {
  addCustomProjectAsset,
  addProjectAsset,
  addProjectAssetTask,
  deleteProjectAsset,
  deleteProjectAssetTask,
  renameProjectAsset,
  renameProjectAssetTask,
  toggleProjectAssetTask,
} from "@/app/actions/projectAssets";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import { CollaboratorSearchModal } from "@/components/collab/CollaboratorSearchModal";
import { ProjectLogoControl } from "@/components/collab/ProjectLogoControl";
import { ProjectTaskRow } from "@/components/collab/ProjectTaskRow";
import type {
  CollabCollaboratorSummary,
  CollabLink,
  CollabProjectData,
  ProjectAssetData,
  ProjectAssetTaskData,
} from "@/lib/collab";
import { validateExternalUrl } from "@/lib/externalLink";

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
  availablePartners: CollabCollaboratorSummary[];
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

// Estados de ProjectTask (pipeline mensaje->tarea, chat-requirements.md
// 3.3/4.1): "pending"/"in_review" son los históricos del checklist manual,
// "pending_approval"/"approved"/"rejected" llegan del chat del proyecto.
// Mapa centralizado en src/lib/projectStatus.ts, usado directamente por
// ProjectTaskRow (Fase 6b) y por el panel de cliente (ClientProfileView).

const QUOTE_CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN" },
  { value: "USD", label: "USD" },
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

// Badge de colaborador para la fila "Colaboradores": partner fundador (sin
// botón de quitar) o ProjectCollaborator adicional (con botón de quitar si
// el viewer está autorizado).
function CollaboratorBadge({
  person,
  headline,
  canRemove,
  busy,
  onRemove,
}: {
  person: CollabPersonSummary;
  headline?: string | null;
  canRemove: boolean;
  busy: boolean;
  onRemove?: () => void;
}) {
  const initials = (person.name?.[0] ?? person.username?.[0] ?? "U").toUpperCase();

  return (
    <Row
      gap="8"
      vertical="center"
      paddingX="12"
      paddingY="8"
      background="neutral-alpha-weak"
      radius="full"
      style={{ minWidth: 0 }}
    >
      <Avatar size="xs" {...(person.imageUrl ? { src: person.imageUrl } : { value: initials })} />
      <Text
        variant="label-default-s"
        onBackground="neutral-strong"
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {person.name ?? person.username ?? "Sin nombre"}
      </Text>
      {headline && <Tag size="s" variant="neutral" label={headline} />}
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
      {canRemove && onRemove && (
        <IconButton
          icon="close"
          size="s"
          variant="tertiary"
          tooltip="Quitar del proyecto"
          tooltipPosition="top"
          loading={busy}
          disabled={busy}
          onClick={onRemove}
        />
      )}
    </Row>
  );
}

// Buscador de colaborador (CollaboratorSearchModal, compartido con el panel
// de cliente) para elegir entre los partners aceptados por el cliente que
// aún no están en este proyecto.
function AddCollaboratorSearch({
  projectId,
  availablePartners,
  onError,
}: {
  projectId: string;
  availablePartners: CollabCollaboratorSummary[];
  onError: (message: string | null) => void;
}) {
  const router = useRouter();

  const handleSelect = async (partnerId: string) => {
    onError(null);
    const result = await addProjectCollaborator(projectId, partnerId);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <CollaboratorSearchModal
      people={availablePartners}
      onSelect={handleSelect}
      trigger={
        <Button variant="tertiary" size="s" prefixIcon="plus">
          Agregar colaborador
        </Button>
      }
      emptyHint="El cliente no tiene otros colaboradores aceptados."
    />
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
  const [quoteAmount, setQuoteAmount] = useState<number | undefined>(
    project.quoteAmount ?? undefined,
  );
  const [quoteCurrency, setQuoteCurrency] = useState(project.quoteCurrency || "MXN");
  const [quoteNotes, setQuoteNotes] = useState(project.quoteNotes ?? "");
  const [startDate, setStartDate] = useState<Date | undefined>(
    project.startDate ? new Date(project.startDate) : undefined,
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    project.dueDate ? new Date(project.dueDate) : undefined,
  );
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
      quoteAmount,
      quoteCurrency,
      quoteNotes,
      startDate: startDate ? startDate.toISOString() : null,
      dueDate: dueDate ? dueDate.toISOString() : null,
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración del proyecto"
      backdrop={modalBackdrop}
    >
      <Column gap="16" fillWidth paddingTop="12">
        <Input
          id="collab-project-title"
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
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
        <Line background="neutral-alpha-weak" />

        <Column gap="12" fillWidth>
          <Text variant="label-strong-s">Cotización y calendario</Text>
          <Row fillWidth gap="8" wrap>
            <Column style={{ flex: 2, minWidth: 160 }}>
              <NumberInput
                id="collab-project-quote-amount"
                label="Monto"
                value={quoteAmount}
                onChange={setQuoteAmount}
                min={0}
              />
            </Column>
            <Column style={{ flex: 1, minWidth: 100 }}>
              <Select
                id="collab-project-quote-currency"
                label="Moneda"
                value={quoteCurrency}
                onSelect={(value) => setQuoteCurrency(value as string)}
                options={QUOTE_CURRENCY_OPTIONS}
              />
            </Column>
          </Row>
          <Textarea
            id="collab-project-quote-notes"
            label="Notas de cotización"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            lines={3}
          />
          <Row fillWidth gap="8" wrap>
            <Column style={{ flex: 1, minWidth: 160 }}>
              <DateInput
                id="collab-project-start-date"
                label="Fecha de inicio"
                value={startDate}
                onChange={setStartDate}
              />
            </Column>
            <Column style={{ flex: 1, minWidth: 160 }}>
              <DateInput
                id="collab-project-due-date"
                label="Fecha de entrega"
                value={dueDate}
                onChange={setDueDate}
              />
            </Column>
          </Row>
        </Column>

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

function AssetTaskRow({ task, canEdit }: { task: ProjectAssetTaskData; canEdit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [savingTitle, setSavingTitle] = useState(false);

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

  const handleSaveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === task.title) {
      setEditingTitle(false);
      setTitleDraft(task.title);
      return;
    }
    setSavingTitle(true);
    const result = await renameProjectAssetTask(task.id, titleDraft);
    setSavingTitle(false);
    if (!result.ok) return;
    setEditingTitle(false);
    router.refresh();
  };

  return (
    <Row fillWidth paddingX="16" paddingY="8" horizontal="between" vertical="center" gap="12" wrap>
      <Row gap="12" vertical="center" style={{ minWidth: 0, flex: 1 }}>
        <Checkbox isChecked={task.done} onToggle={handleToggle} disabled={busy} />
        {editingTitle ? (
          <Column style={{ flex: 1, minWidth: 160 }}>
            <Input
              id={`asset-task-title-${task.id}`}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveTitle();
                if (e.key === "Escape") {
                  setEditingTitle(false);
                  setTitleDraft(task.title);
                }
              }}
            />
          </Column>
        ) : (
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
        )}
      </Row>
      {canEdit && (
        <Row gap="4" vertical="center">
          {editingTitle ? (
            <>
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
                  setTitleDraft(task.title);
                }}
              />
            </>
          ) : (
            <>
              <IconButton
                icon="edit"
                size="s"
                variant="tertiary"
                tooltip="Editar tarea"
                tooltipPosition="top"
                onClick={() => setEditingTitle(true)}
              />
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
            </>
          )}
        </Row>
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
            <Tag
              size="s"
              variant={done === total ? "success" : "neutral"}
              label={`${done}/${total}`}
            />
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

      {error && (
        <Feedback
          variant="danger"
          description={error}
          onClose={() => setError(null)}
          showCloseButton
          fillWidth
        />
      )}

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

// Diálogo de dos columnas (categorías a la izquierda, búsqueda de activos a
// la derecha) para agregar un Activo desde el catálogo o uno personalizado.
function AddAssetSearch({
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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = assetCatalog.find((category) => category.id === selectedCategoryId);
  const filteredTemplates =
    selectedCategory?.templates.filter((template) =>
      template.name.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];

  const handleClose = () => {
    if (saving) return;
    setSelectedCategoryId("");
    setQuery("");
    setShowCustom(false);
    setCustomTitle("");
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saving]);

  const handleAddFromTemplate = async (templateId: string) => {
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

  if (!isOpen) return null;

  return (
    <Row
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      zIndex={10}
      center
      background="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Row
        maxWidth="s"
        fillWidth
        background="surface"
        radius="l-4"
        border="neutral-alpha-medium"
        shadow="l"
        overflow="hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "70vh" }}
      >
        {/* Columna izquierda: categorías del catálogo */}
        <Column
          gap="2"
          padding="8"
          background="surface"
          overflowY="auto"
          style={{ minWidth: 160, flexShrink: 0 }}
        >
          <Row paddingX="12" paddingTop="8" paddingBottom="4">
            <Text variant="label-default-s" onBackground="neutral-weak">
              Categorías
            </Text>
          </Row>
          {assetCatalog.map((category) => {
            const active = category.id === selectedCategoryId;
            return (
              <Row
                key={category.id}
                paddingX="12"
                paddingY="8"
                radius="m"
                cursor="pointer"
                background={active ? "neutral-alpha-weak" : undefined}
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setQuery("");
                  setShowCustom(false);
                }}
              >
                <Text
                  variant="label-default-s"
                  onBackground={active ? "neutral-strong" : "neutral-weak"}
                >
                  {category.name}
                </Text>
              </Row>
            );
          })}
        </Column>

        <Line background="neutral-alpha-weak" vert />

        {/* Columna derecha: búsqueda de activos de la categoría elegida */}
        <Column fillWidth padding="8" gap="4" overflowY="auto" style={{ minHeight: 0 }}>
          <Row fillWidth paddingX="8" paddingTop="4" horizontal="end">
            <IconButton
              icon="close"
              size="s"
              variant="tertiary"
              tooltip="Cerrar"
              tooltipPosition="left"
              onClick={handleClose}
            />
          </Row>

          {!selectedCategory ? (
            <Row fillWidth center paddingY="64">
              <Text variant="body-default-m" onBackground="neutral-weak">
                Selecciona una categoría
              </Text>
            </Row>
          ) : (
            <>
              <Row fillWidth padding="8">
                <Input
                  id="asset-search"
                  placeholder="Buscar activo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  hasPrefix={<Icon name="search" size="xs" onBackground="neutral-weak" />}
                />
              </Row>

              <Column fillWidth gap="2" paddingX="4">
                {filteredTemplates.length === 0 ? (
                  <Row fillWidth center paddingY="32">
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Sin resultados en esta categoría.
                    </Text>
                  </Row>
                ) : (
                  filteredTemplates.map((template) => (
                    <Row
                      key={template.id}
                      fillWidth
                      gap="8"
                      vertical="center"
                      paddingX="12"
                      paddingY="8"
                      radius="m"
                      cursor="pointer"
                      onClick={() => handleAddFromTemplate(template.id)}
                    >
                      <Icon name="sparkles" size="xs" onBackground="neutral-weak" />
                      <Text variant="label-default-s" onBackground="neutral-strong">
                        {template.name}
                      </Text>
                    </Row>
                  ))
                )}
              </Column>
            </>
          )}

          {error && (
            <Row fillWidth paddingX="8">
              <Feedback variant="danger" description={error} />
            </Row>
          )}

          <Row fillWidth paddingX="12" paddingTop="8">
            {!showCustom ? (
              <Text
                variant="label-default-s"
                onBackground="neutral-weak"
                style={{ cursor: "pointer" }}
                onClick={() => setShowCustom(true)}
              >
                ¿No encuentras el activo? Crea uno personalizado
              </Text>
            ) : (
              <Row fillWidth gap="8" vertical="end" wrap>
                <Column style={{ flex: 1, minWidth: 160 }}>
                  <Input
                    id="asset-custom-title"
                    label="Título del activo"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej. Guión de video"
                  />
                </Column>
                <Button
                  variant="primary"
                  size="m"
                  onClick={handleAddCustom}
                  loading={saving}
                  disabled={!customTitle.trim()}
                >
                  Agregar
                </Button>
              </Row>
            )}
          </Row>
        </Column>
      </Row>
    </Row>
  );
}

export function CollabProjectView({
  project,
  client,
  partner,
  viewerRole,
  viewerId,
  assetCatalog,
  availablePartners,
}: CollabProjectViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);

  const [busyCollaboratorId, setBusyCollaboratorId] = useState<string | null>(null);

  const [brandLinkLabel, setBrandLinkLabel] = useState("");
  const [brandLinkUrl, setBrandLinkUrl] = useState("");
  const [brandLinkError, setBrandLinkError] = useState<string | null>(null);
  const [addingBrandLink, setAddingBrandLink] = useState(false);

  const [finalLinkLabel, setFinalLinkLabel] = useState("");
  const [finalLinkUrl, setFinalLinkUrl] = useState("");
  const [finalLinkError, setFinalLinkError] = useState<string | null>(null);
  const [addingFinalLink, setAddingFinalLink] = useState(false);

  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    setBusyCollaboratorId(collaboratorId);
    setError(null);
    const result = await removeProjectCollaborator(project.id, collaboratorId);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusyCollaboratorId(null);
  };

  const handleAddBrandLink = async () => {
    if (!brandLinkLabel.trim() || !brandLinkUrl.trim()) return;
    if (!validateExternalUrl(brandLinkUrl)) {
      setBrandLinkError("La URL no es válida.");
      return;
    }
    setBrandLinkError(null);
    setAddingBrandLink(true);
    setError(null);
    const result = await addProjectLink(project.id, brandLinkLabel, brandLinkUrl);
    if (!result.ok) {
      setError(result.error);
    } else {
      setBrandLinkLabel("");
      setBrandLinkUrl("");
      router.refresh();
    }
    setAddingBrandLink(false);
  };

  const handleAddFinalLink = async () => {
    if (!finalLinkLabel.trim() || !finalLinkUrl.trim()) return;
    if (!validateExternalUrl(finalLinkUrl)) {
      setFinalLinkError("La URL no es válida.");
      return;
    }
    setFinalLinkError(null);
    setAddingFinalLink(true);
    setError(null);
    const result = await addProjectLink(project.id, finalLinkLabel, finalLinkUrl);
    if (!result.ok) {
      setError(result.error);
    } else {
      setFinalLinkLabel("");
      setFinalLinkUrl("");
      router.refresh();
    }
    setAddingFinalLink(false);
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
  const assetProgressPercent =
    totalAssetTasks > 0 ? Math.round((doneAssetTasks / totalAssetTasks) * 100) : 0;

  const brandLinks = project.links.filter((link) => link.type === "brand");
  const finalLinks = project.links.filter((link) => link.type === "final");

  return (
    <Column
      fillWidth
      maxWidth="l"
      horizontal="center"
      paddingX="32"
      paddingTop="40"
      paddingBottom="80"
      gap="24"
    >
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <Column
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        padding="24"
        gap="16"
        fillWidth
      >
        <Row fillWidth gap="16" horizontal="between" vertical="start" wrap>
          <Row gap="16" vertical="start" style={{ minWidth: 0 }}>
            <ProjectLogoControl
              projectId={project.id}
              logoUrl={project.logoUrl}
              title={project.title}
              canEdit
              onSaved={() => router.refresh()}
            />
            <Column gap="12" style={{ minWidth: 0 }}>
              <Row gap="8" vertical="center" wrap>
                <Heading
                  variant="heading-strong-l"
                  style={{ minWidth: 0, overflowWrap: "anywhere" }}
                >
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
              <Row gap="16" wrap style={{ minWidth: 0 }}>
                <PersonBadge label="Cliente" person={client} />
              </Row>
            </Column>
          </Row>
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

        <Column gap="8" fillWidth>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Colaboradores
          </Text>
          <Row gap="12" vertical="center" wrap>
            <CollaboratorBadge person={partner} canRemove={false} busy={false} />
            {project.collaborators.map((collaborator) => (
              <CollaboratorBadge
                key={collaborator.id}
                person={collaborator}
                headline={collaborator.headline}
                canRemove={viewerRole === "client" || collaborator.id === viewerId}
                busy={busyCollaboratorId === collaborator.id}
                onRemove={() => handleRemoveCollaborator(collaborator.id)}
              />
            ))}
            <AddCollaboratorSearch
              projectId={project.id}
              availablePartners={availablePartners}
              onError={setError}
            />
          </Row>
        </Column>

        {viewerRole === "client" && project.clientNotes && (
          <Column background="neutral-alpha-weak" padding="12" radius="m" gap="4">
            <Text variant="label-strong-s">Tus notas</Text>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              style={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {project.clientNotes}
            </Text>
          </Column>
        )}
      </Column>

      {error && (
        <Feedback
          variant="danger"
          description={error}
          onClose={() => setError(null)}
          showCloseButton
          fillWidth
        />
      )}

      {/* ── Chat del proyecto (centralizado en /mensajes) ────────────────── */}
      {project.status === "active" && (
        <Column
          background="surface"
          border="neutral-alpha-weak"
          radius="l"
          padding="24"
          gap="12"
          fillWidth
        >
          <Heading variant="heading-strong-m">Chat del proyecto</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            La conversación del proyecto ahora vive en el centro de mensajes.
          </Text>
          <Row fillWidth horizontal="start">
            <Button
              variant="secondary"
              size="m"
              prefixIcon="email"
              href={`/mensajes?project=${project.id}`}
            >
              Ir a mensajes
            </Button>
          </Row>
        </Column>
      )}

      {/* ── Tareas del proyecto ──────────────────────────────────────────── */}
      {project.tasks.length > 0 && (
        <Column gap="16" fillWidth>
          <Heading variant="heading-strong-m">Tareas del proyecto</Heading>
          <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
            {project.tasks.map((task, index) => (
              <Column key={task.id} fillWidth>
                {index > 0 && <Line background="neutral-alpha-weak" />}
                <ProjectTaskRow
                  task={task}
                  allTasks={project.tasks}
                  canEdit={viewerRole === "partner" && task.status !== "approved"}
                  onChanged={() => router.refresh()}
                />
              </Column>
            ))}
          </Column>
        </Column>
      )}

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

        <Row fillWidth horizontal="end">
          <Button
            variant="secondary"
            size="m"
            prefixIcon="plus"
            onClick={() => setAddAssetOpen(true)}
          >
            Agregar activo
          </Button>
        </Row>
      </Column>

      {/* ── Archivos ─────────────────────────────────────────────────────── */}
      <Column gap="16" fillWidth>
        <Heading variant="heading-strong-m">Archivos del proyecto</Heading>

        <Feedback
          variant="info"
          description="Aquí no se guardan archivos pesados: sube tus materiales a tu servicio de nube (Google Drive, Dropbox, OneDrive, WeTransfer...) con permisos de acceso para compartir, y pega el link abajo."
        />

        <Row fillWidth gap="24" wrap>
          <Column gap="16" style={{ flex: 1, minWidth: 280 }}>
            <Heading variant="heading-strong-s">Activos finales</Heading>

            {finalLinks.length === 0 ? (
              <Text variant="body-default-s" onBackground="neutral-weak">
                Todavía no se han compartido activos finales.
              </Text>
            ) : (
              <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
                {finalLinks.map((link, index) => (
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

            {viewerRole === "partner" && (
              <Column gap="8" fillWidth>
                <Row fillWidth gap="8" wrap>
                  <Column style={{ flex: 1, minWidth: 160 }}>
                    <Input
                      id="collab-new-final-link-label"
                      label="Etiqueta"
                      value={finalLinkLabel}
                      onChange={(e) => setFinalLinkLabel(e.target.value)}
                      placeholder="Ej. Fotos finales"
                    />
                  </Column>
                  <Column style={{ flex: 2, minWidth: 220 }}>
                    <Input
                      id="collab-new-final-link-url"
                      label="URL"
                      value={finalLinkUrl}
                      onChange={(e) => {
                        setFinalLinkUrl(e.target.value);
                        setFinalLinkError(null);
                      }}
                      placeholder="https://drive.google.com/..."
                      error={Boolean(finalLinkError)}
                      errorMessage={finalLinkError ?? undefined}
                    />
                  </Column>
                </Row>
                <Row fillWidth horizontal="end">
                  <Button
                    variant="secondary"
                    size="m"
                    prefixIcon="plus"
                    onClick={handleAddFinalLink}
                    loading={addingFinalLink}
                    disabled={!finalLinkLabel.trim() || !finalLinkUrl.trim()}
                  >
                    Agregar link
                  </Button>
                </Row>
              </Column>
            )}
          </Column>

          <Column gap="16" style={{ flex: 1, minWidth: 280 }}>
            <Heading variant="heading-strong-s">Assets de marca</Heading>

            {brandLinks.length === 0 ? (
              <Text variant="body-default-s" onBackground="neutral-weak">
                Todavía no se han compartido assets de marca.
              </Text>
            ) : (
              <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
                {brandLinks.map((link, index) => (
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

            {viewerRole === "client" && (
              <Column gap="8" fillWidth>
                <Row fillWidth gap="8" wrap>
                  <Column style={{ flex: 1, minWidth: 160 }}>
                    <Input
                      id="collab-new-brand-link-label"
                      label="Etiqueta"
                      value={brandLinkLabel}
                      onChange={(e) => setBrandLinkLabel(e.target.value)}
                      placeholder="Ej. Manual de marca"
                    />
                  </Column>
                  <Column style={{ flex: 2, minWidth: 220 }}>
                    <Input
                      id="collab-new-brand-link-url"
                      label="URL"
                      value={brandLinkUrl}
                      onChange={(e) => {
                        setBrandLinkUrl(e.target.value);
                        setBrandLinkError(null);
                      }}
                      placeholder="https://drive.google.com/..."
                      error={Boolean(brandLinkError)}
                      errorMessage={brandLinkError ?? undefined}
                    />
                  </Column>
                </Row>
                <Row fillWidth horizontal="end">
                  <Button
                    variant="secondary"
                    size="m"
                    prefixIcon="plus"
                    onClick={handleAddBrandLink}
                    loading={addingBrandLink}
                    disabled={!brandLinkLabel.trim() || !brandLinkUrl.trim()}
                  >
                    Agregar link
                  </Button>
                </Row>
              </Column>
            )}
          </Column>
        </Row>
      </Column>

      <ProjectSettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        project={project}
        viewerRole={viewerRole}
      />

      <AddAssetSearch
        isOpen={addAssetOpen}
        onClose={() => setAddAssetOpen(false)}
        projectId={project.id}
        assetCatalog={assetCatalog}
      />
    </Column>
  );
}
