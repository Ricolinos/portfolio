"use client";

import { useEffect, useRef, useState } from "react";
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
  useToast,
} from "@once-ui-system/core";
import {
  getDirectMessages,
  getDirectThreads,
  getEligibleRecipients,
  markDirectThreadRead,
  sendDirectMessage,
  startDirectThread,
  type DirectMessageData,
  type DirectThreadData,
  type EligibleRecipientData,
} from "@/app/actions/directMessages";
import { BrandModalBackdrop } from "@/components/BrandModalBackdrop";

const modalBackdrop = <BrandModalBackdrop />;

// Mismo intervalo de polling que el chat de proyectos colaborativos (ver
// MESSAGE_POLL_INTERVAL_MS en CollabProjectView.tsx) para no divergir el
// patrón de refetch entre ambos chats.
const POLL_INTERVAL_MS = 4000;

function initialsOf(person: { name: string | null; username: string | null }): string {
  return (person.name?.[0] ?? person.username?.[0] ?? "U").toUpperCase();
}

// Hora corta si el mensaje es de hoy, fecha corta en otro caso.
function formatShortTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function ThreadListItem({
  thread,
  active,
  onSelect,
}: {
  thread: DirectThreadData;
  active: boolean;
  onSelect: () => void;
}) {
  const preview = thread.lastMessage?.body ?? "Aún no hay mensajes";
  const time = thread.lastMessage ? formatShortTime(thread.lastMessage.createdAt) : "";

  return (
    <Row
      fillWidth
      gap="12"
      vertical="center"
      padding="12"
      radius="m"
      cursor="interactive"
      background={active ? "brand-alpha-weak" : "transparent"}
      onClick={onSelect}
      style={{ minWidth: 0 }}
    >
      <Avatar
        size="m"
        {...(thread.otherParticipant.imageUrl
          ? { src: thread.otherParticipant.imageUrl }
          : { value: initialsOf(thread.otherParticipant) })}
      />
      <Column gap="4" style={{ minWidth: 0, flex: 1 }}>
        <Row fillWidth gap="8" horizontal="between" vertical="center">
          <Text
            variant="label-default-s"
            onBackground="neutral-strong"
            style={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {thread.otherParticipant.name ?? thread.otherParticipant.username ?? "Usuario"}
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
            {preview}
          </Text>
          {thread.unreadCount > 0 && (
            <Tag size="s" variant="brand" label={String(thread.unreadCount)} />
          )}
        </Row>
      </Column>
    </Row>
  );
}

function MessageBubble({ message, own }: { message: DirectMessageData; own: boolean }) {
  const time = formatShortTime(message.createdAt);

  return (
    <Row fillWidth horizontal={own ? "end" : "start"}>
      <Column
        gap="4"
        paddingX="12"
        paddingY="8"
        radius="m"
        background={own ? "brand-alpha-weak" : "neutral-alpha-weak"}
        style={{ maxWidth: "80%", minWidth: 0 }}
      >
        <Text
          variant="body-default-s"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {message.body}
        </Text>
        <Text variant="label-default-s" onBackground="neutral-weak" align={own ? "right" : "left"}>
          {time}
        </Text>
      </Column>
    </Row>
  );
}

function NewMessageModal({
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
    label: recipient.name ?? recipient.username ?? "Usuario",
    description: recipient.headline ?? undefined,
    hasPrefix: (
      <Avatar
        size="xs"
        {...(recipient.imageUrl ? { src: recipient.imageUrl } : { value: initialsOf(recipient) })}
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

export function MessagesInbox({ viewerId }: { viewerId: string }) {
  const { addToast } = useToast();

  const [threads, setThreads] = useState<DirectThreadData[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const [messages, setMessages] = useState<DirectMessageData[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [sending, setSending] = useState(false);

  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const refetchThreads = async () => {
    const result = await getDirectThreads();
    if (result.ok) setThreads(result.threads);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await getDirectThreads();
      if (cancelled) return;
      if (result.ok) setThreads(result.threads);
      setLoadingThreads(false);
    })();

    const interval = setInterval(() => {
      getDirectThreads().then((result) => {
        if (!cancelled && result.ok) setThreads(result.threads);
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);

    const refetch = async () => {
      const result = await getDirectMessages(selectedThreadId);
      if (!cancelled && result.ok) setMessages(result.messages);
    };

    (async () => {
      await refetch();
      if (cancelled) return;
      setLoadingMessages(false);
      const readResult = await markDirectThreadRead(selectedThreadId);
      if (!cancelled && readResult.ok) refetchThreads();
    })();

    const interval = setInterval(refetch, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedThreadId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = composerText.trim();
    if (!trimmed || !selectedThreadId || sending) return;
    setSending(true);
    const result = await sendDirectMessage(selectedThreadId, trimmed);
    setSending(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    setComposerText("");
    const refreshed = await getDirectMessages(selectedThreadId);
    if (refreshed.ok) setMessages(refreshed.messages);
    refetchThreads();
  };

  const handleCreated = (threadId: string) => {
    setNewMessageOpen(false);
    setSelectedThreadId(threadId);
    refetchThreads();
  };

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? null;
  const showConversation = selectedThreadId !== null;

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
      <Row fillWidth gap="16" horizontal="between" vertical="center" wrap>
        <Heading variant="heading-strong-l">Mensajes</Heading>
        <Button
          variant="primary"
          size="m"
          prefixIcon="plus"
          onClick={() => setNewMessageOpen(true)}
        >
          Nuevo mensaje
        </Button>
      </Row>

      <Row
        fillWidth
        border="neutral-alpha-weak"
        radius="l"
        background="surface"
        overflow="hidden"
        style={{ height: "70vh" }}
      >
        {/* ── Lista de hilos ─────────────────────────────────────────── */}
        <Column
          gap="4"
          padding="12"
          overflowY="auto"
          borderRight="neutral-alpha-weak"
          style={{ flex: 1, minWidth: 0 }}
          s={{ hide: showConversation }}
          xs={{ hide: showConversation }}
        >
          {!loadingThreads && threads.length === 0 ? (
            <Column fillWidth fillHeight center gap="12" padding="24">
              <Icon name="email" size="l" onBackground="neutral-weak" />
              <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                Aún no tienes conversaciones. Inicia una nueva para contactar a un partner.
              </Text>
              <Button
                variant="secondary"
                size="s"
                prefixIcon="plus"
                onClick={() => setNewMessageOpen(true)}
              >
                Nuevo mensaje
              </Button>
            </Column>
          ) : (
            threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                active={thread.id === selectedThreadId}
                onSelect={() => setSelectedThreadId(thread.id)}
              />
            ))
          )}
        </Column>

        {/* ── Conversación activa ────────────────────────────────────── */}
        <Column
          style={{ flex: 2, minWidth: 0 }}
          s={{ hide: !showConversation }}
          xs={{ hide: !showConversation }}
        >
          {!selectedThread ? (
            <Column fillWidth fillHeight center gap="8" padding="24">
              <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                Selecciona una conversación para ver los mensajes.
              </Text>
            </Column>
          ) : (
            <>
              <Row
                fillWidth
                gap="12"
                vertical="center"
                padding="16"
                borderBottom="neutral-alpha-weak"
              >
                <IconButton
                  icon="chevronLeft"
                  size="s"
                  variant="tertiary"
                  tooltip="Volver a la lista"
                  onClick={() => setSelectedThreadId(null)}
                />
                <Avatar
                  size="s"
                  {...(selectedThread.otherParticipant.imageUrl
                    ? { src: selectedThread.otherParticipant.imageUrl }
                    : { value: initialsOf(selectedThread.otherParticipant) })}
                />
                <Text
                  variant="label-default-s"
                  onBackground="neutral-strong"
                  style={{ minWidth: 0, overflowWrap: "anywhere" }}
                >
                  {selectedThread.otherParticipant.name ??
                    selectedThread.otherParticipant.username ??
                    "Usuario"}
                </Text>
              </Row>

              <Column
                ref={scrollRef}
                gap="8"
                padding="16"
                overflowY="auto"
                style={{ flex: 1, minWidth: 0 }}
              >
                {!loadingMessages && messages.length === 0 ? (
                  <Row fillWidth center paddingY="32">
                    <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                      Aún no hay mensajes. Escribe el primero.
                    </Text>
                  </Row>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      own={message.senderId === viewerId}
                    />
                  ))
                )}
              </Column>

              <Line background="neutral-alpha-weak" />

              <Row fillWidth gap="8" vertical="end" padding="16">
                <Column style={{ flex: 1, minWidth: 0 }}>
                  <Input
                    id="direct-message-input"
                    placeholder="Escribe un mensaje..."
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={sending}
                  />
                </Column>
                <Button
                  variant="primary"
                  size="m"
                  prefixIcon="arrowUpRight"
                  onClick={handleSend}
                  loading={sending}
                  disabled={!composerText.trim() || sending}
                >
                  Enviar
                </Button>
              </Row>
            </>
          )}
        </Column>
      </Row>

      <NewMessageModal
        isOpen={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onCreated={handleCreated}
      />
    </Column>
  );
}
