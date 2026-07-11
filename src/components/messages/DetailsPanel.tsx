"use client";

import { useState } from "react";
import {
  AccordionGroup,
  Avatar,
  Button,
  Column,
  Grid,
  IconButton,
  Input,
  Media,
  Modal,
  Row,
  SmartLink,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { ProjectMemberRole } from "@/generated/prisma/enums";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import type {
  ChannelContextData,
  ChannelContextParticipant,
  ConversationSummary,
} from "@/app/actions/inbox";
import {
  assignProjectRole,
  createChannel,
  deleteChannel,
  removeProjectRole,
  renameChannel,
} from "@/app/actions/channels";
import { TaskCard } from "./TaskCard";
import {
  ROLE_LABELS,
  ROLE_OPTIONS,
  parseMessageBody,
  personInitial,
  personLabel,
  type StreamMessage,
} from "./messengerUtils";

/* ══ Panel derecho: metadatos del chat y gestión de proyecto (2.3) ══════ */

const modalBackdrop = <BrandModalBackdrop />;

/* ── Sección: Roles del proyecto ─────────────────────────────────────── */

function RolesSection({
  context,
  onChanged,
}: {
  context: ChannelContextData;
  onChanged: () => void;
}) {
  const { addToast } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const partnerSet = new Set(context.partnerParticipants);
  const partners = context.participants.filter((person) => partnerSet.has(person.id));
  const withoutRole = partners.filter((person) => person.roles.length === 0);

  const hasRole = (userId: string, role: ProjectMemberRole) =>
    partners.find((person) => person.id === userId)?.roles.includes(role) ?? false;

  const handleToggle = async (userId: string, role: ProjectMemberRole) => {
    const key = `${userId}-${role}`;
    if (busyKey) return;
    setBusyKey(key);
    const active = hasRole(userId, role);
    const result = active
      ? await removeProjectRole(context.project.id, userId, role)
      : await assignProjectRole(context.project.id, userId, role);
    if (!result.ok) addToast({ variant: "danger", message: result.error });
    setBusyKey(null);
    onChanged();
  };

  return (
    <Column gap="20" fillWidth>
      {partners.length === 0 ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Todavía no hay partners en este proyecto.
        </Text>
      ) : (
        <>
          {ROLE_OPTIONS.map((role) => {
            const withRole = partners.filter((person) => person.roles.includes(role));
            return (
              <Column key={role} gap="8" fillWidth>
                <Text variant="label-strong-s" onBackground="neutral-strong">
                  {ROLE_LABELS[role]}
                </Text>
                {withRole.length === 0 ? (
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Nadie asignado.
                  </Text>
                ) : (
                  <Row gap="8" wrap>
                    {withRole.map((person) => (
                      <Row key={person.id} gap="8" vertical="center">
                        <Avatar
                          size="xs"
                          {...(person.imageUrl
                            ? { src: person.imageUrl }
                            : { value: personInitial(person) })}
                        />
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {personLabel(person)}
                        </Text>
                      </Row>
                    ))}
                  </Row>
                )}
              </Column>
            );
          })}

          <Column gap="8" fillWidth>
            <Text variant="label-strong-s" onBackground="neutral-strong">
              Sin rol
            </Text>
            {withoutRole.length === 0 ? (
              <Text variant="label-default-s" onBackground="neutral-weak">
                Todos los partners tienen al menos un rol.
              </Text>
            ) : (
              <Row gap="8" wrap>
                {withoutRole.map((person) => (
                  <Row key={person.id} gap="8" vertical="center">
                    <Avatar
                      size="xs"
                      {...(person.imageUrl
                        ? { src: person.imageUrl }
                        : { value: personInitial(person) })}
                    />
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {personLabel(person)}
                    </Text>
                  </Row>
                ))}
              </Row>
            )}
          </Column>

          {context.isAdmin && (
            <Column gap="12" fillWidth paddingTop="8" borderTop="neutral-alpha-weak">
              <Text variant="label-strong-s" onBackground="neutral-strong">
                Asignar roles
              </Text>
              {partners.map((partner) => (
                <Column key={partner.id} gap="8" fillWidth>
                  <Row gap="8" vertical="center">
                    <Avatar
                      size="xs"
                      {...(partner.imageUrl
                        ? { src: partner.imageUrl }
                        : { value: personInitial(partner) })}
                    />
                    <Text variant="label-default-s" onBackground="neutral-strong">
                      {personLabel(partner)}
                    </Text>
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
              ))}
            </Column>
          )}
        </>
      )}
    </Column>
  );
}

/* ── Sección: Gestión de tareas ──────────────────────────────────────── */

function TasksSection({
  context,
  viewerId,
  onChanged,
}: {
  context: ChannelContextData;
  viewerId: string;
  onChanged: () => void;
}) {
  return (
    <Column gap="16" fillWidth>
      <Text variant="body-default-s" onBackground="neutral-weak">
        Convierte cualquier mensaje en tarea desde el chat.
      </Text>
      {context.tasks.length === 0 ? (
        <Text variant="label-default-s" onBackground="neutral-weak">
          Sin tareas todavía.
        </Text>
      ) : (
        context.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            viewerId={viewerId}
            onResolved={onChanged}
            variant="row"
          />
        ))
      )}
    </Column>
  );
}

/* ── Sección: Multimedia y archivos ──────────────────────────────────── */

function MediaSection({ messages }: { messages: StreamMessage[] }) {
  const images: string[] = [];
  const links: string[] = [];

  for (const message of messages) {
    const { parts, images: messageImages } = parseMessageBody(message.body);
    images.push(...messageImages);
    for (const part of parts) {
      if (part.url) links.push(part.url);
    }
  }

  if (images.length === 0 && links.length === 0) {
    return (
      <Text variant="label-default-s" onBackground="neutral-weak">
        Sin imágenes ni enlaces compartidos todavía.
      </Text>
    );
  }

  return (
    <Column gap="16" fillWidth>
      {images.length > 0 && (
        <Grid columns={3} gap="8" fillWidth>
          {images.map((url) => (
            <Media
              key={url}
              src={url}
              alt="Imagen compartida"
              aspectRatio="1 / 1"
              radius="m"
              enlarge
            />
          ))}
        </Grid>
      )}
      {links.length > 0 && (
        <Column gap="8" fillWidth>
          {links.map((url) => (
            <SmartLink key={url} href={url} style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              {url}
            </SmartLink>
          ))}
        </Column>
      )}
    </Column>
  );
}

/* ── Sección: Privacidad y ayuda ─────────────────────────────────────── */

function PrivacySection({
  conversation,
  context,
  onChannelsChanged,
  onChannelDeleted,
}: {
  conversation: ConversationSummary;
  context: ChannelContextData | null;
  onChannelsChanged: (preferChannelId?: string) => void;
  onChannelDeleted: () => void;
}) {
  const { addToast } = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(context?.channel.name ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  if (conversation.kind === "direct" || !context) {
    return (
      <Text variant="body-default-s" onBackground="neutral-weak">
        Esta es una conversación privada 1 a 1. Hub-Nerds no comparte tus mensajes con terceros.
      </Text>
    );
  }

  if (!context.isAdmin) {
    return (
      <Text variant="body-default-s" onBackground="neutral-weak">
        Este canal pertenece al proyecto {context.project.title}. Solo el cliente administrador
        puede renombrarlo o eliminarlo.
      </Text>
    );
  }

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    setSaving(true);
    const result = await renameChannel(context.channel.id, trimmed);
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: "Canal renombrado." });
    setRenameOpen(false);
    onChannelsChanged(context.channel.id);
  };

  const handleCreate = async () => {
    const trimmed = createValue.trim();
    if (!trimmed || trimmed.length > 60) return;
    setSaving(true);
    const result = await createChannel(context.project.id, trimmed);
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    addToast({ variant: "success", message: "Canal creado." });
    setCreateOpen(false);
    setCreateValue("");
    onChannelsChanged(result.channelId);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    const result = await deleteChannel(context.channel.id);
    setSaving(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      setConfirmDelete(false);
      return;
    }
    addToast({ variant: "success", message: "Canal eliminado." });
    onChannelDeleted();
  };

  return (
    <Column gap="12" fillWidth>
      <Button variant="secondary" size="s" prefixIcon="edit" onClick={() => setRenameOpen(true)}>
        Renombrar canal
      </Button>
      <Button variant="secondary" size="s" prefixIcon="plus" onClick={() => setCreateOpen(true)}>
        Crear nueva sala del proyecto
      </Button>
      <Button
        variant={confirmDelete ? "danger" : "secondary"}
        size="s"
        prefixIcon="trash"
        onClick={handleDelete}
        loading={saving && confirmDelete}
      >
        {confirmDelete ? "Confirmar eliminación" : "Eliminar canal"}
      </Button>

      <Modal
        isOpen={renameOpen}
        onClose={() => !saving && setRenameOpen(false)}
        title="Renombrar canal"
        backdrop={modalBackdrop}
      >
        <Column gap="16" fillWidth paddingTop="12">
          <Input
            id="details-rename-channel"
            label="Nombre del canal"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <Row fillWidth gap="8" horizontal="end">
            <Button
              variant="secondary"
              size="m"
              onClick={() => setRenameOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="m" onClick={handleRename} loading={saving}>
              Guardar
            </Button>
          </Row>
        </Column>
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Nueva sala"
        backdrop={modalBackdrop}
      >
        <Column gap="16" fillWidth paddingTop="12">
          <Input
            id="details-create-channel"
            label="Nombre del canal"
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            placeholder="Ej. Revisión de assets"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Row fillWidth gap="8" horizontal="end">
            <Button
              variant="secondary"
              size="m"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="primary" size="m" onClick={handleCreate} loading={saving}>
              Crear canal
            </Button>
          </Row>
        </Column>
      </Modal>
    </Column>
  );
}

/* ── Componente principal ─────────────────────────────────────────────── */

export function DetailsPanel({
  conversation,
  viewerId,
  channelContext,
  loadingContext,
  messages,
  mobileView,
  onBack,
  onContextRefresh,
  onChannelsChanged,
  onChannelDeleted,
}: {
  conversation: ConversationSummary;
  viewerId: string;
  channelContext: ChannelContextData | null;
  loadingContext: boolean;
  messages: StreamMessage[];
  mobileView: "list" | "conversation" | "info";
  onBack: () => void;
  onContextRefresh: () => void;
  onChannelsChanged: (preferChannelId?: string) => void;
  onChannelDeleted: () => void;
}) {
  const isGroup = conversation.kind === "group";

  const profileName = isGroup ? conversation.title : conversation.title;
  const profileMeta = isGroup
    ? (conversation.project?.title ?? conversation.subtitle)
    : conversation.subtitle;

  const infoContent = isGroup ? (
    <Column gap="8" fillWidth>
      <Row gap="8" vertical="center">
        <Text variant="label-strong-s" onBackground="neutral-strong">
          Canal
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {channelContext?.channel.name ?? conversation.title}
        </Text>
      </Row>
      <Row gap="8" vertical="center">
        <Text variant="label-strong-s" onBackground="neutral-strong">
          Proyecto
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {conversation.project?.title ?? "—"}
        </Text>
      </Row>
      {channelContext && (
        <Row gap="8" vertical="center">
          <Text variant="label-strong-s" onBackground="neutral-strong">
            Estado
          </Text>
          <Tag size="s" variant="neutral" label={channelContext.project.status} />
        </Row>
      )}
    </Column>
  ) : (
    <Column gap="8" fillWidth>
      <Row gap="8" vertical="center">
        <Text variant="label-strong-s" onBackground="neutral-strong">
          Usuario
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          @{conversation.participant?.username ?? "usuario"}
        </Text>
      </Row>
      {conversation.participant?.headline && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {conversation.participant.headline}
        </Text>
      )}
    </Column>
  );

  const items = [
    { title: "Información del chat", content: infoContent },
    ...(isGroup
      ? [
          {
            title: "Roles del proyecto",
            content: !channelContext ? (
              <Text variant="label-default-s" onBackground="neutral-weak">
                {loadingContext ? "Cargando..." : "Sin datos."}
              </Text>
            ) : (
              <RolesSection context={channelContext} onChanged={onContextRefresh} />
            ),
          },
          {
            title: "Gestión de tareas",
            content: !channelContext ? (
              <Text variant="label-default-s" onBackground="neutral-weak">
                {loadingContext ? "Cargando..." : "Sin datos."}
              </Text>
            ) : (
              <TasksSection
                context={channelContext}
                viewerId={viewerId}
                onChanged={onContextRefresh}
              />
            ),
          },
        ]
      : []),
    { title: "Multimedia y archivos", content: <MediaSection messages={messages} /> },
    {
      title: "Privacidad y ayuda",
      content: (
        <PrivacySection
          conversation={conversation}
          context={channelContext}
          onChannelsChanged={onChannelsChanged}
          onChannelDeleted={onChannelDeleted}
        />
      ),
    },
  ];

  return (
    <Column
      fillHeight
      gap="20"
      padding="16"
      overflowY="auto"
      borderLeft="neutral-alpha-weak"
      style={{ width: 320, minWidth: 0, flexShrink: 0 }}
      s={{ hide: mobileView !== "info" }}
      xs={{ hide: mobileView !== "info" }}
    >
      <Row fillWidth gap="8" vertical="center">
        <Row hide s={{ hide: false }} xs={{ hide: false }}>
          <IconButton
            icon="chevronLeft"
            size="s"
            variant="tertiary"
            tooltip="Volver a la conversación"
            onClick={onBack}
          />
        </Row>
        <Text variant="label-strong-s" onBackground="neutral-strong">
          Detalles
        </Text>
      </Row>

      <Column fillWidth gap="12" horizontal="center">
        <Avatar
          size="xl"
          {...(conversation.avatarUrl
            ? { src: conversation.avatarUrl }
            : isGroup
              ? { icon: "userGroup" as const }
              : { value: personInitial({ name: profileName, username: null }) })}
        />
        <Column gap="2" horizontal="center">
          <Text variant="heading-strong-s" onBackground="neutral-strong" align="center">
            {profileName}
          </Text>
          {profileMeta && (
            <Text variant="body-default-s" onBackground="neutral-weak" align="center">
              {profileMeta}
            </Text>
          )}
        </Column>

        <Row gap="8">
          {isGroup && conversation.project ? (
            <IconButton
              icon="briefcase"
              size="s"
              variant="secondary"
              tooltip="Ir al proyecto"
              href={`/proyectos/${conversation.project.id}`}
            />
          ) : (
            conversation.participant?.username && (
              <IconButton
                icon="person"
                size="s"
                variant="secondary"
                tooltip="Ver perfil"
                href={`/${conversation.participant.username}`}
              />
            )
          )}
        </Row>
      </Column>

      <AccordionGroup items={items} autoCollapse={false} />
    </Column>
  );
}
