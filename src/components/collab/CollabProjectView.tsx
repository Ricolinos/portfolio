"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Column,
  Feedback,
  Heading,
  Icon,
  IconButton,
  Input,
  Line,
  Modal,
  Row,
  Select,
  Tag,
  Text,
  Textarea,
} from "@once-ui-system/core";
import type { CollabLink, CollabProjectData, CollabTask } from "@/lib/collab";
import { validateExternalUrl } from "@/lib/externalLink";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import {
  addProjectCollaborator,
  addProjectLink,
  addProjectTask,
  deleteProjectLink,
  deleteProjectTask,
  removeProjectCollaborator,
  updateCollabProject,
  updateTaskStatus,
} from "@/app/actions/collab";
import type { CollabCollaboratorSummary } from "@/lib/collab";

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

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  approved: "Aprobada",
};

const TASK_STATUS_VARIANTS: Record<string, "neutral" | "warning" | "success"> = {
  pending: "neutral",
  in_review: "warning",
  approved: "success",
};

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

function AddCollaboratorModal({
  isOpen,
  onClose,
  projectId,
  availablePartners,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  availablePartners: CollabCollaboratorSummary[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = availablePartners.map((partner) => ({
    value: partner.id,
    label: partner.name ?? partner.username ?? "Sin nombre",
  }));

  const handleAdd = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    const result = await addProjectCollaborator(projectId, selectedId);
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setSaving(false);
    setSelectedId("");
    onClose();
    router.refresh();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar colaborador" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Select
          id="collab-add-collaborator"
          label="Partner"
          value={selectedId}
          onSelect={(value) => setSelectedId(value as string)}
          options={options}
        />
        {error && <Feedback variant="danger" description={error} />}
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" size="m" onClick={handleAdd} loading={saving} disabled={!selectedId}>
            Agregar
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

function TaskRow({
  task,
  viewerRole,
  busy,
  onStatusChange,
  onDelete,
}: {
  task: CollabTask;
  viewerRole: ViewerRole;
  busy: boolean;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
}) {
  return (
    <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" gap="16" wrap>
      <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
        <Icon name="briefcase" size="s" onBackground="neutral-weak" />
        <Text
          variant="label-default-m"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {task.title}
        </Text>
      </Row>

      <Row gap="8" vertical="center">
        <Tag
          size="s"
          variant={TASK_STATUS_VARIANTS[task.status] ?? "neutral"}
          label={TASK_STATUS_LABELS[task.status] ?? task.status}
        />

        {viewerRole === "partner" && task.status === "pending" && (
          <IconButton
            icon="arrowUpRight"
            size="s"
            variant="tertiary"
            tooltip="Enviar a aprobación"
            tooltipPosition="top"
            loading={busy}
            disabled={busy}
            onClick={() => onStatusChange("in_review")}
          />
        )}
        {viewerRole === "partner" && task.status === "in_review" && (
          <IconButton
            icon="refreshCw"
            size="s"
            variant="tertiary"
            tooltip="Regresar a pendiente"
            tooltipPosition="top"
            loading={busy}
            disabled={busy}
            onClick={() => onStatusChange("pending")}
          />
        )}
        {viewerRole === "client" && task.status === "in_review" && (
          <>
            <IconButton
              icon="check"
              size="s"
              variant="success"
              tooltip="Aprobar tarea"
              tooltipPosition="top"
              loading={busy}
              disabled={busy}
              onClick={() => onStatusChange("approved")}
            />
            <IconButton
              icon="xCircle"
              size="s"
              variant="danger"
              tooltip="Rechazar y regresar a pendiente"
              tooltipPosition="top"
              loading={busy}
              disabled={busy}
              onClick={() => onStatusChange("pending")}
            />
          </>
        )}
        {viewerRole === "partner" && task.status !== "approved" && (
          <IconButton
            icon="trash"
            size="s"
            variant="tertiary"
            tooltip="Eliminar tarea"
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

export function CollabProjectView({
  project,
  client,
  partner,
  viewerRole,
  viewerId,
  availablePartners,
}: CollabProjectViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [collaboratorModalOpen, setCollaboratorModalOpen] = useState(false);
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

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    setAddingTask(true);
    setError(null);
    const result = await addProjectTask(project.id, taskTitle);
    if (!result.ok) {
      setError(result.error);
    } else {
      setTaskTitle("");
      router.refresh();
    }
    setAddingTask(false);
  };

  const handleTaskStatus = async (taskId: string, status: string) => {
    setBusyTaskId(taskId);
    setError(null);
    const result = await updateTaskStatus(taskId, status);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusyTaskId(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    setBusyTaskId(taskId);
    setError(null);
    const result = await deleteProjectTask(taskId);
    if (!result.ok) setError(result.error);
    else router.refresh();
    setBusyTaskId(null);
  };

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

  const brandLinks = project.links.filter((link) => link.type === "brand");
  const finalLinks = project.links.filter((link) => link.type === "final");

  return (
    <Column fillWidth maxWidth="l" horizontal="center" paddingX="32" paddingTop="40" paddingBottom="80" gap="24">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <Column background="surface" border="neutral-alpha-weak" radius="l" padding="24" gap="16" fillWidth>
        <Row fillWidth gap="16" horizontal="between" vertical="start" wrap>
          <Column gap="12" style={{ minWidth: 0 }}>
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
            <Row gap="16" wrap style={{ minWidth: 0 }}>
              <PersonBadge label="Cliente" person={client} />
            </Row>
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
            <Button
              variant="tertiary"
              size="s"
              prefixIcon="plus"
              onClick={() => setCollaboratorModalOpen(true)}
              disabled={availablePartners.length === 0}
            >
              Agregar colaborador
            </Button>
            {availablePartners.length === 0 && (
              <Text variant="label-default-s" onBackground="neutral-weak">
                El cliente no tiene otros colaboradores aceptados.
              </Text>
            )}
          </Row>
        </Column>

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

      {/* ── Tareas ───────────────────────────────────────────────────────── */}
      <Column gap="16" fillWidth>
        <Row fillWidth horizontal="between" vertical="center">
          <Heading variant="heading-strong-m">Tareas</Heading>
          <Text variant="label-default-s" onBackground="neutral-weak">
            {project.tasks.length} {project.tasks.length === 1 ? "tarea" : "tareas"}
          </Text>
        </Row>

        {project.tasks.length === 0 ? (
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
              Aún no hay tareas en este proyecto.
            </Text>
          </Column>
        ) : (
          <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
            {project.tasks.map((task, index) => (
              <Column key={task.id} fillWidth>
                {index > 0 && <Line background="neutral-alpha-weak" />}
                <TaskRow
                  task={task}
                  viewerRole={viewerRole}
                  busy={busyTaskId === task.id}
                  onStatusChange={(status) => handleTaskStatus(task.id, status)}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              </Column>
            ))}
          </Column>
        )}

        {viewerRole === "partner" && (
          <Row fillWidth gap="8" vertical="end" wrap>
            <Column style={{ flex: 1, minWidth: 200 }}>
              <Input
                id="collab-new-task"
                label="Nueva tarea"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ej. Entregar primer boceto"
              />
            </Column>
            <Button
              variant="secondary"
              size="m"
              prefixIcon="plus"
              onClick={handleAddTask}
              loading={addingTask}
              disabled={!taskTitle.trim()}
            >
              Agregar
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

      <AddCollaboratorModal
        isOpen={collaboratorModalOpen}
        onClose={() => setCollaboratorModalOpen(false)}
        projectId={project.id}
        availablePartners={availablePartners}
      />
    </Column>
  );
}
