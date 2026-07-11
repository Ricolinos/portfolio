"use client";

import { Avatar, Column, IconButton, Media, Row, SmartLink, Text } from "@once-ui-system/core";
import { TaskCard } from "./TaskCard";
import {
  formatShortTime,
  parseMessageBody,
  personInitial,
  personLabel,
  type StreamMessage,
} from "./messengerUtils";

/* ══ Burbuja de mensaje del stream (direct o de canal, normalizados) ═════
   Asimétrica por emisor (own vs ajeno), con detección de imágenes/enlaces
   embebidos en el cuerpo y trigger opcional para convertir el mensaje en
   tarea (solo mensajes de grupo sin tarea vinculada). ══════════════════ */

export function MessageBubble({
  message,
  own,
  viewerId,
  isGroup,
  onConvertClick,
  onTaskResolved,
}: {
  message: StreamMessage;
  own: boolean;
  viewerId: string;
  isGroup: boolean;
  onConvertClick?: () => void;
  onTaskResolved?: () => void;
}) {
  const time = formatShortTime(message.createdAt);
  const { parts, images } = parseMessageBody(message.body);
  const showConvertTrigger = isGroup && !message.task && onConvertClick;

  return (
    <Column gap="4" fillWidth>
      <Row fillWidth gap="8" horizontal={own ? "end" : "start"} vertical="end">
        {isGroup && !own && (
          <Avatar
            size="xs"
            {...(message.sender.imageUrl
              ? { src: message.sender.imageUrl }
              : { value: personInitial(message.sender) })}
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
          {isGroup && !own && (
            <Text variant="label-default-s" onBackground="neutral-weak">
              {personLabel(message.sender)}
            </Text>
          )}
          {parts.some((part) => part.text) && (
            <Text
              variant="body-default-s"
              onBackground="neutral-strong"
              style={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {parts.map((part, index) =>
                part.url ? (
                  <SmartLink key={index} href={part.url}>
                    {part.text}
                  </SmartLink>
                ) : (
                  <span key={index}>{part.text}</span>
                ),
              )}
            </Text>
          )}
          {images.map((url) => (
            <Media
              key={url}
              src={url}
              alt="Imagen compartida en el chat"
              radius="m"
              aspectRatio="16 / 9"
              enlarge
              style={{ maxWidth: 240 }}
            />
          ))}
          <Text
            variant="label-default-s"
            onBackground="neutral-weak"
            align={own ? "right" : "left"}
          >
            {time}
          </Text>
        </Column>
        {isGroup && own && (
          <Avatar
            size="xs"
            {...(message.sender.imageUrl
              ? { src: message.sender.imageUrl }
              : { value: personInitial(message.sender) })}
          />
        )}
        {showConvertTrigger && (
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
          <TaskCard
            task={message.task}
            viewerId={viewerId}
            onResolved={onTaskResolved ?? (() => {})}
          />
        </Row>
      )}
    </Column>
  );
}
