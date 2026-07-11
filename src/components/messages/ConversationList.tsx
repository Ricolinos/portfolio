"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Column,
  Feedback,
  Heading,
  Icon,
  IconButton,
  Input,
  Modal,
  Row,
  SegmentedControl,
  Select,
  Tag,
  Text,
} from "@once-ui-system/core";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";
import {
  getEligibleRecipients,
  startDirectThread,
  type EligibleRecipientData,
} from "@/app/actions/directMessages";
import type { ConversationSummary } from "@/app/actions/inbox";
import { formatShortTime, personInitial, personLabel } from "./messengerUtils";

/* ══ Panel izquierdo: bandeja de conversaciones (2.1) ═══════════════════ */

const modalBackdrop = <BrandModalBackdrop />;

type SegmentFilter = "all" | "unread" | "groups";

const SEGMENTS = [
  { value: "all", label: "Todos" },
  { value: "unread", label: "No leídos" },
  { value: "groups", label: "Grupos" },
];

function NewConversationModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}) {
  const [recipients, setRecipients] = useState<EligibleRecipientData[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingRecipients(true);
    setError(null);
    (async () => {
      const result = await getEligibleRecipients();
      if (result.ok) setRecipients(result.recipients);
      else setError(result.error);
      setLoadingRecipients(false);
    })();
  }, [isOpen]);

  const handleClose = () => {
    if (sending) return;
    setRecipientId("");
    setFirstMessage("");
    setError(null);
    onClose();
  };

  const handleStart = async () => {
    if (!recipientId || !firstMessage.trim()) return;
    setSending(true);
    setError(null);
    const result = await startDirectThread(recipientId, firstMessage);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRecipientId("");
    setFirstMessage("");
    onCreated(result.threadId);
  };

  const options = recipients.map((recipient) => ({
    value: recipient.id,
    label: personLabel(recipient),
    description: recipient.headline ?? undefined,
    hasPrefix: (
      <Avatar
        size="xs"
        {...(recipient.imageUrl
          ? { src: recipient.imageUrl }
          : { value: personInitial(recipient) })}
      />
    ),
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nuevo mensaje" backdrop={modalBackdrop}>
      <Column gap="16" fillWidth paddingTop="12">
        <Select
          id="new-message-recipient"
          label="Destinatario"
          placeholder={loadingRecipients ? "Cargando..." : "Selecciona a quién escribir"}
          value={recipientId}
          onSelect={(value) => setRecipientId(value as string)}
          options={options}
          searchable
          disabled={loadingRecipients}
        />
        <Input
          id="new-message-body"
          label="Mensaje"
          placeholder="Escribe tu primer mensaje..."
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
        />

        {error && (
          <Feedback
            variant="danger"
            description={error}
            onClose={() => setError(null)}
            showCloseButton
            fillWidth
          />
        )}

        <Row fillWidth gap="8" horizontal="end">
          <Button variant="secondary" size="m" onClick={handleClose} disabled={sending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="m"
            onClick={handleStart}
            loading={sending}
            disabled={!recipientId || !firstMessage.trim()}
          >
            Enviar
          </Button>
        </Row>
      </Column>
    </Modal>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const preview = conversation.lastMessage?.body ?? "Aún no hay mensajes";
  const time = conversation.lastMessage ? formatShortTime(conversation.lastMessage.createdAt) : "";

  return (
    <Row
      fillWidth
      gap="12"
      vertical="center"
      padding="12"
      radius="m"
      cursor="interactive"
      background={active ? "neutral-alpha-weak" : "transparent"}
      onClick={onSelect}
      style={{ minWidth: 0 }}
    >
      <Avatar
        size="m"
        {...(conversation.avatarUrl
          ? { src: conversation.avatarUrl }
          : conversation.kind === "group"
            ? { icon: "userGroup" as const }
            : { value: (conversation.title[0] ?? "U").toUpperCase() })}
      />
      <Column gap="4" style={{ minWidth: 0, flex: 1 }}>
        <Row fillWidth gap="8" horizontal="between" vertical="center">
          <Text
            variant="label-default-s"
            onBackground="neutral-strong"
            truncate
            style={{ minWidth: 0 }}
          >
            {conversation.title}
          </Text>
          {time && (
            <Text variant="label-default-s" onBackground="neutral-weak">
              {time}
            </Text>
          )}
        </Row>
        <Row fillWidth gap="8" horizontal="between" vertical="center">
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            truncate
            style={{ minWidth: 0 }}
          >
            {conversation.subtitle ? `${conversation.subtitle} · ${preview}` : preview}
          </Text>
          {conversation.unreadCount > 0 && (
            <Tag size="s" variant="brand" label={String(conversation.unreadCount)} />
          )}
        </Row>
      </Column>
    </Row>
  );
}

export function ConversationList({
  conversations,
  scopeTitle,
  loading,
  selectedKey,
  onSelect,
  onCreated,
}: {
  conversations: ConversationSummary[];
  scopeTitle?: string | null;
  loading: boolean;
  selectedKey: string | null;
  onSelect: (conversation: ConversationSummary) => void;
  onCreated: (threadId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SegmentFilter>("all");
  const [newConversationOpen, setNewConversationOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (filter === "unread" && conversation.unreadCount <= 0) return false;
      if (filter === "groups" && conversation.kind !== "group") return false;
      if (query) {
        const haystack = `${conversation.title} ${conversation.subtitle ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [conversations, search, filter]);

  return (
    <Column fillHeight fillWidth gap="12" padding="16" style={{ minWidth: 0 }}>
      <Row fillWidth horizontal="between" vertical="center">
        <Column gap="0">
          <Heading variant="heading-strong-m">Chats</Heading>
          {scopeTitle && (
            <Text variant="label-default-s" onBackground="neutral-weak" truncate>
              {scopeTitle}
            </Text>
          )}
        </Column>
        <Row gap="4">
          <IconButton
            icon="settings"
            size="s"
            variant="tertiary"
            tooltip="Próximamente"
            tooltipPosition="bottom"
            disabled
          />
          <IconButton
            icon="plus"
            size="s"
            variant="secondary"
            tooltip="Nueva conversación"
            tooltipPosition="bottom"
            onClick={() => setNewConversationOpen(true)}
          />
        </Row>
      </Row>

      <Input
        id="conversation-search"
        placeholder="Buscar conversaciones..."
        hasPrefix={<Icon name="search" size="xs" onBackground="neutral-weak" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <SegmentedControl
        buttons={SEGMENTS}
        selected={filter}
        onToggle={(value) => setFilter(value as SegmentFilter)}
      />

      <Column gap="4" overflowY="auto" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
        {!loading && filtered.length === 0 ? (
          <Column fillWidth center gap="12" padding="24">
            <Icon name="email" size="l" onBackground="neutral-weak" />
            <Text variant="body-default-s" onBackground="neutral-weak" align="center">
              {conversations.length === 0
                ? "Aún no tienes conversaciones. Inicia una nueva para contactar a un partner."
                : "Ninguna conversación coincide con el filtro."}
            </Text>
            {conversations.length === 0 && (
              <Button
                variant="secondary"
                size="s"
                prefixIcon="plus"
                onClick={() => setNewConversationOpen(true)}
              >
                Nuevo mensaje
              </Button>
            )}
          </Column>
        ) : (
          filtered.map((conversation) => (
            <ConversationRow
              key={conversation.key}
              conversation={conversation}
              active={conversation.key === selectedKey}
              onSelect={() => onSelect(conversation)}
            />
          ))
        )}
      </Column>

      <NewConversationModal
        isOpen={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        onCreated={(threadId) => {
          setNewConversationOpen(false);
          onCreated(threadId);
        }}
      />
    </Column>
  );
}
