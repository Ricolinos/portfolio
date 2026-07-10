"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
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
  addProjectLink,
  addProjectTask,
  deleteProjectLink,
  deleteProjectTask,
  updateCollabProject,
  updateTaskStatus,
} from "@/app/actions/collab";

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

const QUOTE_CURRENCY_OPTIONS = [
  { value: "MXN", label: "MXN" },
  { value: "USD", label: "USD" },
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
  const [quoteAmount, setQuoteAmount] = useState<number | undefined>(project.quoteAmount ?? undefined);
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

export function CollabProjectView({ project, client, partner, viewerRole, viewerId }: CollabProjectViewProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
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
    </Column>
  );
}
