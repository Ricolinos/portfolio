"use client";

import { useEffect, useRef, useState } from "react";
import { Column, Row, useToast } from "@once-ui-system/core";
import {
  getChannelContext,
  getInbox,
  type ChannelContextData,
  type ConversationSummary,
} from "@/app/actions/inbox";
import {
  getChannelMessages,
  sendChannelMessage,
  type ChannelMessageData,
} from "@/app/actions/channels";
import {
  getDirectMessages,
  markDirectThreadRead,
  sendDirectMessage,
  type DirectMessageData,
} from "@/app/actions/directMessages";
import { ConversationList } from "./ConversationList";
import { ConversationPanel } from "./ConversationPanel";
import { DetailsPanel } from "./DetailsPanel";
import { fromChannelMessage, fromDirectMessage, type StreamMessage } from "./messengerUtils";

/* ══ Vista maestra de /mensajes: layout Messenger de 3 paneles ══════════
   (chat-messenger-refactor.md 2.1/2.2/2.3). Orquesta la bandeja unificada
   (getInbox), el stream de la conversación activa (directMessages o
   channels según ConversationSummary.kind) y el contexto de proyecto del
   panel derecho (getChannelContext), con polling client-side de 4s. ═════ */

const POLL_INTERVAL_MS = 4000;

type MobileView = "list" | "conversation" | "info";

export function MessengerView({
  viewerId,
  initialProjectId,
}: {
  viewerId: string;
  initialProjectId?: string;
}) {
  const { addToast } = useToast();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [channelContext, setChannelContext] = useState<ChannelContextData | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const [infoOpen, setInfoOpen] = useState(true);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const deepLinkApplied = useRef(false);

  const selectedConversation = conversations.find((c) => c.key === selectedKey) ?? null;

  /* ── Bandeja: polling de getInbox + deep link ?project= ─────────────── */

  const refetchInbox = async (): Promise<ConversationSummary[]> => {
    const result = await getInbox();
    if (result.ok) {
      setConversations(result.conversations);
      return result.conversations;
    }
    return [];
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await getInbox();
      if (cancelled) return;
      if (result.ok) {
        setConversations(result.conversations);
        if (!deepLinkApplied.current && initialProjectId) {
          deepLinkApplied.current = true;
          const target = result.conversations.find(
            (c) => c.kind === "group" && c.project?.id === initialProjectId,
          );
          if (target) {
            setSelectedKey(target.key);
            setMobileView("conversation");
          }
        }
      }
      setLoadingConversations(false);
    })();

    const interval = setInterval(async () => {
      const result = await getInbox();
      if (!cancelled && result.ok) setConversations(result.conversations);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  /* ── Conversación activa: stream de mensajes con polling ─────────────── */

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);

    const refetch = async () => {
      if (selectedConversation.kind === "direct" && selectedConversation.threadId) {
        const result = await getDirectMessages(selectedConversation.threadId);
        if (!cancelled && result.ok) {
          setMessages(result.messages.map(fromDirectMessage));
        } else if (!cancelled && !result.ok) {
          addToast({ variant: "danger", message: result.error });
        }
      } else if (selectedConversation.kind === "group" && selectedConversation.channelId) {
        const result = await getChannelMessages(selectedConversation.channelId);
        if (!cancelled && result.ok) {
          setMessages(result.messages.map(fromChannelMessage));
        } else if (!cancelled && !result.ok) {
          addToast({ variant: "danger", message: result.error });
        }
      }
    };

    (async () => {
      await refetch();
      if (cancelled) return;
      setLoadingMessages(false);
      if (selectedConversation.kind === "direct" && selectedConversation.threadId) {
        const readResult = await markDirectThreadRead(selectedConversation.threadId);
        if (!cancelled && readResult.ok) refetchInbox();
      }
    })();

    const interval = setInterval(refetch, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.key]);

  /* ── Contexto de canal (panel derecho, solo grupos) ───────────────────── */

  const refetchContext = async (channelId: string) => {
    const result = await getChannelContext(channelId);
    if (result.ok) setChannelContext(result);
    else addToast({ variant: "danger", message: result.error });
  };

  useEffect(() => {
    if (
      !selectedConversation ||
      selectedConversation.kind !== "group" ||
      !selectedConversation.channelId
    ) {
      setChannelContext(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    (async () => {
      await refetchContext(selectedConversation.channelId!);
      if (!cancelled) setLoadingContext(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.key]);

  /* ── Handlers ──────────────────────────────────────────────────────────── */

  const handleSelect = (conversation: ConversationSummary) => {
    setSelectedKey(conversation.key);
    setMobileView("conversation");
  };

  const handleBackToList = () => {
    setSelectedKey(null);
    setMobileView("list");
  };

  const handleToggleInfo = () => {
    setInfoOpen((prev) => {
      const next = !prev;
      setMobileView(next ? "info" : "conversation");
      return next;
    });
  };

  const handleBackFromInfo = () => {
    setMobileView("conversation");
  };

  const handleSend = async (body: string) => {
    if (!selectedConversation || sending) return;
    setSending(true);
    const result =
      selectedConversation.kind === "direct" && selectedConversation.threadId
        ? await sendDirectMessage(selectedConversation.threadId, body)
        : selectedConversation.kind === "group" && selectedConversation.channelId
          ? await sendChannelMessage(selectedConversation.channelId, body)
          : { ok: false as const, error: "Conversación inválida." };
    setSending(false);
    if (!result.ok) {
      addToast({ variant: "danger", message: result.error });
      return;
    }
    if (selectedConversation.kind === "direct" && selectedConversation.threadId) {
      const refreshed = await getDirectMessages(selectedConversation.threadId);
      if (refreshed.ok) setMessages(refreshed.messages.map(fromDirectMessage));
    } else if (selectedConversation.kind === "group" && selectedConversation.channelId) {
      const refreshed = await getChannelMessages(selectedConversation.channelId);
      if (refreshed.ok) setMessages(refreshed.messages.map(fromChannelMessage));
    }
    refetchInbox();
  };

  const handleConversationCreated = async (threadId: string) => {
    const list = await refetchInbox();
    const target = list.find((c) => c.threadId === threadId);
    if (target) {
      setSelectedKey(target.key);
      setMobileView("conversation");
    }
  };

  const handleTaskChanged = async () => {
    if (selectedConversation?.kind === "group" && selectedConversation.channelId) {
      const result = await getChannelMessages(selectedConversation.channelId);
      if (result.ok) setMessages(result.messages.map(fromChannelMessage));
      await refetchContext(selectedConversation.channelId);
    }
  };

  const handleContextRefresh = async () => {
    if (selectedConversation?.kind === "group" && selectedConversation.channelId) {
      await refetchContext(selectedConversation.channelId);
    }
  };

  const handleChannelsChanged = async (preferChannelId?: string) => {
    const list = await refetchInbox();
    if (preferChannelId) {
      const target = list.find((c) => c.channelId === preferChannelId);
      if (target) setSelectedKey(target.key);
      await refetchContext(preferChannelId);
    }
  };

  const handleChannelDeleted = async () => {
    setSelectedKey(null);
    setMobileView("list");
    setChannelContext(null);
    await refetchInbox();
  };

  const partnerParticipants = channelContext
    ? channelContext.participants.filter((person) =>
        channelContext.partnerParticipants.includes(person.id),
      )
    : [];
  const assets = channelContext?.assets ?? [];

  return (
    <Column
      fillWidth
      fillHeight
      border="neutral-alpha-weak"
      radius="l"
      background="surface"
      overflow="hidden"
      style={{ minHeight: "70vh" }}
    >
      <Row fillWidth fillHeight style={{ minWidth: 0 }}>
        <Column
          borderRight="neutral-alpha-weak"
          style={{ width: 320, minWidth: 0, flexShrink: 0 }}
          s={{ hide: mobileView !== "list" }}
          xs={{ hide: mobileView !== "list" }}
        >
          <ConversationList
            conversations={conversations}
            loading={loadingConversations}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            onCreated={handleConversationCreated}
          />
        </Column>

        <ConversationPanel
          conversation={selectedConversation}
          viewerId={viewerId}
          messages={messages}
          loadingMessages={loadingMessages}
          sending={sending}
          onSend={handleSend}
          infoOpen={infoOpen}
          onToggleInfo={handleToggleInfo}
          onBack={handleBackToList}
          mobileView={mobileView}
          partnerParticipants={partnerParticipants}
          assets={assets}
          onTaskChanged={handleTaskChanged}
        />

        {selectedConversation && infoOpen && (
          <DetailsPanel
            conversation={selectedConversation}
            viewerId={viewerId}
            channelContext={channelContext}
            loadingContext={loadingContext}
            messages={messages}
            mobileView={mobileView}
            onBack={handleBackFromInfo}
            onContextRefresh={handleContextRefresh}
            onChannelsChanged={handleChannelsChanged}
            onChannelDeleted={handleChannelDeleted}
          />
        )}
      </Row>
    </Column>
  );
}
