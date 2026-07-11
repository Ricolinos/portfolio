"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarGroup,
  Button,
  Column,
  DateInput,
  Heading,
  Icon,
  IconButton,
  Input,
  Modal,
  Row,
  Select,
  Tag,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { ProjectMemberRole } from "@/generated/prisma/enums";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import {
  assignProjectRole,
  createChannel,
  createTaskFromMessage,
  deleteChannel,
  getChannelMessages,
  getChannels,
  getProjectRoles,
  removeProjectRole,
  renameChannel,
  resolveTaskApproval,
  sendChannelMessage,
} from "@/app/actions/channels";
import type { ChannelData, ChannelMessageData, ProjectRoleData } from "@/app/actions/channels";

/* ══ Chat robusto por canales del panel de proyecto colaborativo (Fase 3/4 ══
   de chat-requirements.md): barra lateral de canales + conversación con el
   pipeline mensaje->tarea embebido. Polling client-side, sin websockets. ══ */

type ViewerRole = "client" | "partner";

export interface ChatParticipant {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
}

export interface ChatAsset {
  id: string;
  title: string;
}

interface ProjectChatProps {
  projectId: string;
  viewerId: string;
  viewerRole: ViewerRole;
  participants: ChatParticipant[];
  partnerParticipants: ChatParticipant[];
  assets: ChatAsset[];
}

const CHAT_POLL_INTERVAL_MS = 4000;

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  pending_approval: "Por aprobar",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const TASK_STATUS_VARIANTS: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  pending: "neutral",
  in_review: "neutral",
  pending_approval: "warning",
  approved: "success",
  rejected: "danger",
};

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  PLANNER: "Planner",
  REALIZADOR: "Realizador",
  DESIGNER: "Designer",
  EDITOR: "Editor",
};

const ROLE_OPTIONS = Object.values(ProjectMemberRole);

const modalBackdrop = <BrandModalBackdrop />;

function personLabel(person: ChatParticipant): string {
  return person.name ?? person.username ?? "Usuario";
}

function personInitial(person: ChatParticipant): string {
  return (person.name?.[0] ?? person.username?.[0] ?? "U").toUpperCase();
}

/* ══ Crear canal (solo cliente) ═══════════════════════════════════════ */

function CreateChannelModal({
  isOpen,
  onClose,
  projectId,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (channelId: string) => void;
}) {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setName("");
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return;
    setSaving(true);
    const result = await createChannel(projectId, trimmed);
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: "Canal creado." });
    setName("");
    onCreated(result.channelId);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo canal" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Input
          id="new-channel-name"
          label="Nombre del canal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. General"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleCreate}
            loading={saving}
            disabled={!name.trim() || name.trim().length > 60}
          >
            Crear canal
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Renombrar canal (solo cliente) ════════════════════════════════════ */

function RenameChannelModal({
  isOpen,
  onClose,
  channel,
  onRenamed,
}: {
  isOpen: boolean;
  onClose: () => void;
  channel: ChannelData | null;
  onRenamed: () => void;
}) {
  const { addToast } = useToast();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (channel) setName(channel.name);
  }, [channel]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    if (!channel) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) return;
    setSaving(true);
    const result = await renameChannel(channel.id, trimmed);
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: "Canal renombrado." });
    onRenamed();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Renombrar canal" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Input
          id="rename-channel-name"
          label="Nombre del canal"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || name.trim().length > 60}
          >
            Guardar
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Panel de administración de roles (solo cliente) ═══════════════════ */

function RolesModal({
  isOpen,
  onClose,
  projectId,
  partnerParticipants,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  partnerParticipants: ChatParticipant[];
}) {
  const { addToast } = useToast();
  const [roles, setRoles] = useState<ProjectRoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const result = await getProjectRoles(projectId);
      if (cancelled) return;
      if (result.ok) setRoles(result.roles);
      else addToast({ variant: "danger", message: result.error });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const hasRole = (userId: string, role: ProjectMemberRole) =>
    roles.some((entry) => entry.userId === userId && entry.role === role);

  const handleToggle = async (userId: string, role: ProjectMemberRole) => {
    const key = `${userId}-${role}`;
    if (busyKey) return;
    setBusyKey(key);
    const active = hasRole(userId, role);
    const result = active
      ? await removeProjectRole(projectId, userId, role)
      : await assignProjectRole(projectId, userId, role);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      setBusyKey(null);
      return;
    }
    const refreshed = await getProjectRoles(projectId);
    if (refreshed.ok) setRoles(refreshed.roles);
    setBusyKey(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Roles del equipo" backdrop={modalBackdrop}>
      <Column gap="20" fillWidth paddingTop="12">
        {loading ? (
          <Row fillWidth center paddingY="24">
            <Text variant="body-default-s" onBackground="neutral-weak">
              Cargando roles...
            </Text>
          </Row>
        ) : partnerParticipants.length === 0 ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            Todavía no hay partners en este proyecto.
          </Text>
        ) : (
          partnerParticipants.map((partner) => (
            <Column key={partner.id} gap="8" fillWidth>
              <Row gap="8" vertical="center">
                <Avatar
                  size="xs"
                  {...(partner.imageUrl
                    ? { src: partner.imageUrl }
                    : { value: personInitial(partner) })}
                />
                <Text variant="label-strong-s">{personLabel(partner)}</Text>
              </Row>
              <Row gap="8" wrap>
                {ROLE_OPTIONS.map((role) => {
                  const active = hasRole(partner.id, role);
                  return (
                    <Tag
                      key={role}
                      size="s"
                      variant={active ? "brand" : "neutral"}
                      label={ROLE_LABELS[role]}
                      prefixIcon={active ? "check" : undefined}
                      cursor="interactive"
                      onClick={() => handleToggle(partner.id, role)}
                    />
                  );
                })}
              </Row>
            </Column>
          ))
        )}
        <Row fillWidth horizontal="end">
          <Button variant="secondary" size="m" onClick={onClose}>
            Cerrar
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Fila de canal en la barra lateral ═════════════════════════════════ */

function ChannelRow({
  channel,
  active,
  canManage,
  onSelect,
  onRenameClick,
  onDeleted,
}: {
  channel: ChannelData;
  active: boolean;
  canManage: boolean;
  onSelect: () => void;
  onRenameClick: () => void;
  onDeleted: () => void;
}) {
  const { addToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const result = await deleteChannel(channel.id);
    setDeleting(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      setConfirmDelete(false);
      return;
    }
    addToast({ variant: "success", message: "Canal eliminado." });
    onDeleted();
  };

  return (
    <Row
      fillWidth
      gap="8"
      vertical="center"
      horizontal="between"
      paddingX="12"
      paddingY="8"
      radius="m"
      cursor="interactive"
      background={active ? "neutral-alpha-weak" : undefined}
      onClick={onSelect}
      style={{ minWidth: 0 }}
    >
      <Text
        variant="label-default-s"
        onBackground={active ? "neutral-strong" : "neutral-weak"}
        style={{ minWidth: 0, overflowWrap: "anywhere" }}
      >
        {channel.name}
      </Text>
      {canManage && (
        <Row gap="2" vertical="center" onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon="edit"
            size="s"
            variant="tertiary"
            tooltip="Renombrar canal"
            tooltipPosition="top"
            onClick={onRenameClick}
          />
          <IconButton
            icon="trash"
            size="s"
            variant={confirmDelete ? "danger" : "tertiary"}
            tooltip={confirmDelete ? "Confirmar eliminación" : "Eliminar canal"}
            tooltipPosition="top"
            loading={deleting}
            disabled={deleting}
            onClick={handleDelete}
          />
        </Row>
      )}
    </Row>
  );
}

/* ══ Barra lateral de canales ═══════════════════════════════════════════ */

function ChannelSidebar({
  channels,
  loading,
  selectedChannelId,
  canManage,
  onSelect,
  onCreateClick,
  onRenameClick,
  onDeleted,
}: {
  channels: ChannelData[];
  loading: boolean;
  selectedChannelId: string | null;
  canManage: boolean;
  onSelect: (id: string) => void;
  onCreateClick: () => void;
  onRenameClick: (channel: ChannelData) => void;
  onDeleted: () => void;
}) {
  return (
    <Column
      gap="4"
      padding="12"
      border="neutral-alpha-weak"
      radius="l"
      background="surface"
      fillWidth
    >
      <Row fillWidth horizontal="between" vertical="center" paddingX="4" paddingBottom="8">
        <Text variant="label-default-s" onBackground="neutral-weak">
          Canales
        </Text>
        {canManage && (
          <IconButton
            icon="plus"
            size="s"
            variant="tertiary"
            tooltip="Nuevo canal"
            tooltipPosition="top"
            onClick={onCreateClick}
          />
        )}
      </Row>

      {loading ? (
        <Row fillWidth center paddingY="24">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Cargando...
          </Text>
        </Row>
      ) : channels.length === 0 ? (
        <Row fillWidth paddingX="12" paddingY="8">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Sin canales todavía.
          </Text>
        </Row>
      ) : (
        channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={channel.id === selectedChannelId}
            canManage={canManage}
            onSelect={() => onSelect(channel.id)}
            onRenameClick={() => onRenameClick(channel)}
            onDeleted={onDeleted}
          />
        ))
      )}
    </Column>
  );
}

/* ══ Modal: convertir mensaje en tarea ══════════════════════════════════ */

function CreateTaskModal({
  isOpen,
  onClose,
  message,
  partnerParticipants,
  assets,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  message: ChannelMessageData | null;
  partnerParticipants: ChatParticipant[];
  assets: ChatAsset[];
  onCreated: () => void;
}) {
  const { addToast } = useToast();
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && message) {
      setDescription(message.body);
      setAssigneeId("");
      setAssetId("");
      setDueDate(undefined);
    }
  }, [isOpen, message]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!message) return;
    if (!assigneeId) {
      addToast({ variant: "danger", message: "Selecciona un responsable." });
      return;
    }
    setSaving(true);
    const result = await createTaskFromMessage(message.id, {
      description: description.trim() || undefined,
      assigneeId,
      assetId: assetId || undefined,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
    });
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: "Tarea creada. Queda pendiente de aprobación." });
    onCreated();
    onClose();
  };

  const assetOptions = [
    { value: "", label: "Sin activo" },
    ...assets.map((asset) => ({ value: asset.id, label: asset.title })),
  ];
  const assigneeOptions = partnerParticipants.map((partner) => ({
    value: partner.id,
    label: personLabel(partner),
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Convertir mensaje en tarea"
      backdrop={modalBackdrop}
    >
      <Column gap="16" fillWidth paddingTop="12">
        <Textarea
          id="task-from-message-description"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          lines={4}
        />
        <Select
          id="task-from-message-assignee"
          label="Responsable"
          placeholder="Selecciona un responsable"
          value={assigneeId}
          onSelect={(value) => setAssigneeId(value as string)}
          options={assigneeOptions}
        />
        <Select
          id="task-from-message-asset"
          label="Activo del proyecto"
          value={assetId}
          onSelect={(value) => setAssetId(value as string)}
          options={assetOptions}
        />
        <DateInput
          id="task-from-message-due-date"
          label="Fecha límite"
          value={dueDate}
          onChange={setDueDate}
        />
        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleSubmit}
            loading={saving}
            disabled={!assigneeId}
          >
            Crear tarea
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

/* ══ Tarjeta de tarea embebida en la conversación ═══════════════════════ */

function TaskCard({
  task,
  viewerId,
  onResolved,
}: {
  task: NonNullable<ChannelMessageData["task"]>;
  viewerId: string;
  onResolved: () => void;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [resolving, setResolving] = useState(false);

  const statusLabel = TASK_STATUS_LABELS[task.status] ?? task.status;
  const statusVariant = TASK_STATUS_VARIANTS[task.status] ?? "neutral";
  const canResolve = task.status === "pending_approval" && task.assignee?.id === viewerId;

  const handleResolve = async (approve: boolean) => {
    setResolving(true);
    const result = await resolveTaskApproval(task.id, approve);
    setResolving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: approve ? "Tarea aprobada." : "Tarea rechazada." });
    onResolved();
    router.refresh();
  };

  return (
    <Column
      gap="8"
      padding="12"
      radius="m"
      border="neutral-alpha-medium"
      background="surface"
      style={{ maxWidth: "80%", minWidth: 0 }}
    >
      <Row fillWidth gap="8" horizontal="between" vertical="center" wrap>
        <Text
          variant="label-strong-s"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {task.title}
        </Text>
        <Tag size="s" variant={statusVariant} label={statusLabel} />
      </Row>

      {task.assignee && (
        <Row gap="8" vertical="center">
          <Avatar
            size="xs"
            {...(task.assignee.imageUrl
              ? { src: task.assignee.imageUrl }
              : {
                  value: (
                    task.assignee.name?.[0] ??
                    task.assignee.username?.[0] ??
                    "U"
                  ).toUpperCase(),
                })}
          />
          <Text variant="label-default-s" onBackground="neutral-weak">
            {task.assignee.name ?? task.assignee.username ?? "Sin asignar"}
          </Text>
        </Row>
      )}

      <Row gap="16" wrap>
        {task.dueDate && (
          <Row gap="4" vertical="center">
            <Icon name="calendar" size="xs" onBackground="neutral-weak" />
            <Text variant="label-default-s" onBackground="neutral-weak">
              {new Date(task.dueDate).toLocaleDateString()}
            </Text>
          </Row>
        )}
        {task.asset && (
          <Row gap="4" vertical="center">
            <Icon name="shapes" size="xs" onBackground="neutral-weak" />
            <Text variant="label-default-s" onBackground="neutral-weak">
              {task.asset.title}
            </Text>
          </Row>
        )}
      </Row>

      {canResolve && (
        <Row fillWidth gap="8" horizontal="end">
          <Button
            variant="danger"
            size="s"
            prefixIcon="xCircle"
            onClick={() => handleResolve(false)}
            loading={resolving}
            disabled={resolving}
          >
            Rechazar
          </Button>
          <Button
            variant="primary"
            size="s"
            prefixIcon="check"
            onClick={() => handleResolve(true)}
            loading={resolving}
            disabled={resolving}
          >
            Aprobar
          </Button>
        </Row>
      )}
    </Column>
  );
}

/* ══ Burbuja de mensaje ══════════════════════════════════════════════════ */

function ChatMessageBubble({
  message,
  own,
  viewerId,
  onConvertClick,
  onTaskResolved,
}: {
  message: ChannelMessageData;
  own: boolean;
  viewerId: string;
  onConvertClick: () => void;
  onTaskResolved: () => void;
}) {
  const senderLabel = message.sender.name ?? message.sender.username ?? "Usuario";
  const initials = (message.sender.name?.[0] ?? message.sender.username?.[0] ?? "U").toUpperCase();
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Column gap="4" fillWidth>
      <Row fillWidth gap="8" horizontal={own ? "end" : "start"} vertical="end">
        {!own && (
          <Avatar
            size="xs"
            {...(message.sender.imageUrl ? { src: message.sender.imageUrl } : { value: initials })}
          />
        )}
        <Column
          gap="4"
          paddingX="12"
          paddingY="8"
          radius="m"
          background={own ? "brand-alpha-weak" : "neutral-alpha-weak"}
          style={{ maxWidth: "70%", minWidth: 0 }}
        >
          <Text variant="label-default-s" onBackground="neutral-weak">
            {senderLabel}
          </Text>
          <Text
            variant="body-default-s"
            onBackground="neutral-strong"
            style={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {message.body}
          </Text>
          <Text
            variant="label-default-s"
            onBackground="neutral-weak"
            align={own ? "right" : "left"}
          >
            {time}
          </Text>
        </Column>
        {own && (
          <Avatar
            size="xs"
            {...(message.sender.imageUrl ? { src: message.sender.imageUrl } : { value: initials })}
          />
        )}
        {!message.task && (
          <IconButton
            icon="document"
            size="s"
            variant="tertiary"
            tooltip="Convertir en tarea"
            tooltipPosition="top"
            onClick={onConvertClick}
          />
        )}
      </Row>
      {message.task && (
        <Row fillWidth horizontal={own ? "end" : "start"}>
          <TaskCard task={message.task} viewerId={viewerId} onResolved={onTaskResolved} />
        </Row>
      )}
    </Column>
  );
}

/* ══ Conversación del canal seleccionado ════════════════════════════════ */

function ChannelConversation({
  channel,
  viewerId,
  partnerParticipants,
  assets,
}: {
  channel: ChannelData;
  viewerId: string;
  partnerParticipants: ChatParticipant[];
  assets: ChatAsset[];
}) {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<ChannelMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [taskMessage, setTaskMessage] = useState<ChannelMessageData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refetchMessages = async () => {
    const result = await getChannelMessages(channel.id);
    if (result.ok) setMessages(result.messages);
    else addToast({ variant: "danger", message: result.error });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);

    (async () => {
      const result = await getChannelMessages(channel.id);
      if (cancelled) return;
      if (result.ok) setMessages(result.messages);
      else addToast({ variant: "danger", message: result.error });
      setLoading(false);
    })();

    const interval = setInterval(async () => {
      const result = await getChannelMessages(channel.id);
      if (!cancelled && result.ok) setMessages(result.messages);
    }, CHAT_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    const result = await sendChannelMessage(channel.id, trimmed);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      setSending(false);
      return;
    }
    setText("");
    await refetchMessages();
    setSending(false);
  };

  return (
    <Column fillWidth gap="12" style={{ minWidth: 0 }}>
      <Heading variant="heading-strong-s" style={{ minWidth: 0, overflowWrap: "anywhere" }}>
        {channel.name}
      </Heading>

      <Column
        ref={scrollRef}
        fillWidth
        gap="16"
        padding="16"
        border="neutral-alpha-weak"
        radius="l"
        background="surface"
        overflowY="auto"
        style={{ maxHeight: 420, minWidth: 0 }}
      >
        {!loading && messages.length === 0 ? (
          <Row fillWidth center paddingY="32">
            <Text variant="body-default-s" onBackground="neutral-weak" align="center">
              Aún no hay mensajes en este canal.
            </Text>
          </Row>
        ) : (
          messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              message={message}
              own={message.senderId === viewerId}
              viewerId={viewerId}
              onConvertClick={() => setTaskMessage(message)}
              onTaskResolved={refetchMessages}
            />
          ))
        )}
      </Column>

      <Row fillWidth gap="8" vertical="end">
        <Column style={{ flex: 1, minWidth: 0 }}>
          <Input
            id={`channel-message-input-${channel.id}`}
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </Column>
        <Button
          variant="primary"
          size="m"
          prefixIcon="arrowUpRight"
          onClick={handleSend}
          loading={sending}
          disabled={!text.trim() || sending}
        >
          Enviar
        </Button>
      </Row>

      <CreateTaskModal
        isOpen={taskMessage !== null}
        onClose={() => setTaskMessage(null)}
        message={taskMessage}
        partnerParticipants={partnerParticipants}
        assets={assets}
        onCreated={refetchMessages}
      />
    </Column>
  );
}

/* ══ Componente principal ════════════════════════════════════════════════ */

export function ProjectChat({
  projectId,
  viewerId,
  viewerRole,
  participants,
  partnerParticipants,
  assets,
}: ProjectChatProps) {
  const { addToast } = useToast();
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChannelData | null>(null);
  const [rolesOpen, setRolesOpen] = useState(false);

  const canManageChannels = viewerRole === "client";

  const refreshChannels = async (preferId?: string) => {
    const result = await getChannels(projectId);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    setChannels(result.channels);
    setSelectedChannelId((prev) => {
      if (preferId) return preferId;
      if (prev && result.channels.some((channel) => channel.id === prev)) return prev;
      return result.channels[0]?.id ?? null;
    });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getChannels(projectId);
      if (cancelled) return;
      if (result.ok) {
        setChannels(result.channels);
        setSelectedChannelId(result.channels[0]?.id ?? null);
      } else {
        addToast({ variant: "danger", message: result.error });
      }
      setChannelsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const selectedChannel = channels.find((channel) => channel.id === selectedChannelId) ?? null;

  const participantAvatars = participants.map((person) => ({
    ...(person.imageUrl ? { src: person.imageUrl } : { value: personInitial(person) }),
  }));

  return (
    <Column fillWidth gap="16">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
        <Row gap="12" vertical="center" wrap>
          <Heading variant="heading-strong-m">Chat del proyecto</Heading>
          {participantAvatars.length > 0 && (
            <AvatarGroup avatars={participantAvatars} size="xs" limit={5} />
          )}
        </Row>
        {viewerRole === "client" && (
          <Button
            variant="secondary"
            size="s"
            prefixIcon="shield"
            onClick={() => setRolesOpen(true)}
          >
            Roles del equipo
          </Button>
        )}
      </Row>

      <Row fillWidth gap="16" s={{ direction: "column" }} style={{ minWidth: 0 }}>
        <Column style={{ width: 240, minWidth: 0, flexShrink: 0 }}>
          <ChannelSidebar
            channels={channels}
            loading={channelsLoading}
            selectedChannelId={selectedChannelId}
            canManage={canManageChannels}
            onSelect={setSelectedChannelId}
            onCreateClick={() => setCreateChannelOpen(true)}
            onRenameClick={setRenameTarget}
            onDeleted={() => refreshChannels()}
          />
        </Column>

        <Column style={{ flex: 1, minWidth: 0 }}>
          {!selectedChannel ? (
            <Column
              fillWidth
              horizontal="center"
              gap="8"
              padding="32"
              border="neutral-alpha-medium"
              radius="l"
            >
              <Icon name="sparkles" size="l" onBackground="neutral-weak" />
              <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                {channelsLoading
                  ? "Cargando canales..."
                  : canManageChannels
                    ? "Crea un canal para empezar a chatear."
                    : "Todavía no hay canales en este proyecto."}
              </Text>
            </Column>
          ) : (
            <ChannelConversation
              key={selectedChannel.id}
              channel={selectedChannel}
              viewerId={viewerId}
              partnerParticipants={partnerParticipants}
              assets={assets}
            />
          )}
        </Column>
      </Row>

      <CreateChannelModal
        isOpen={createChannelOpen}
        onClose={() => setCreateChannelOpen(false)}
        projectId={projectId}
        onCreated={(id) => {
          refreshChannels(id);
          setCreateChannelOpen(false);
        }}
      />

      <RenameChannelModal
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        channel={renameTarget}
        onRenamed={() => refreshChannels()}
      />

      {canManageChannels && (
        <RolesModal
          isOpen={rolesOpen}
          onClose={() => setRolesOpen(false)}
          projectId={projectId}
          partnerParticipants={partnerParticipants}
        />
      )}
    </Column>
  );
}
