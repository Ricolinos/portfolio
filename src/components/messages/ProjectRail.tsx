"use client";

import { Avatar, Column, HoverCard, IconButton, Line, Row, Tooltip } from "@once-ui-system/core";
import { type ReactNode, useEffect, useState } from "react";
import { getEligibleRecipients } from "@/app/actions/directMessages";
import {
  CollaboratorSearchModal,
  type CollaboratorSearchPerson,
} from "@/components/collab/CollaboratorSearchModal";
import { presenceColor, presenceOf, type RailScope, sameScope } from "./messengerUtils";
import { NewConversationModal } from "./NewConversationModal";

/* ══ Riel vertical: dos secciones — Usuarios (hilos directos) y Proyectos ══
   (2026-07-11, rediseño de /mensajes). Cada sección tiene un icono de
   cabecera (IconButton con tooltip nativo de Once UI, no interactivo — solo
   etiqueta) y debajo los avatares/logos correspondientes. Cada avatar/logo
   usa el mismo patrón de tooltip que IconButton (HoverCard + Tooltip, ambos
   exportados por el paquete — ver node_modules/@once-ui-system/core/dist/
   components/IconButton.js) en vez del atributo nativo `title`, que tiene
   demasiado delay en el browser para servir de confirmación visual rápida.
   Seleccionar un avatar cambia el scope de MessengerView y, para usuarios,
   además abre directamente ese hilo. El botón "+" de la sección Usuarios es
   el único punto de entrada para arrancar un chat nuevo (antes había uno
   duplicado en el header de ConversationList): usa CollaboratorSearchModal,
   el mismo command-palette Kbar del gestor de proyectos, para no reinventar
   un buscador propio — al elegir persona, se abre NewConversationModal con
   initialRecipientId ya fijo (solo falta escribir el primer mensaje). ══ */

export interface RailProject {
  id: string;
  title: string;
  logoUrl: string | null;
}

export interface RailUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  lastSeenAt: string | null;
  presenceStatus: string | null;
}

const TAB_SIZE = 40;

// Envoltura de tooltip compartida por avatares de usuario y logos de
// proyecto: mismo HoverCard+Tooltip que usa IconButton internamente,
// anclado al costado derecho del riel (el riel es angosto y vertical, así
// que "top"/"bottom" chocarían con los avatares vecinos).
function RailTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <HoverCard
      trigger={children}
      placement="right"
      fade={0}
      scale={0.9}
      duration={200}
      offsetDistance="8"
    >
      <Tooltip label={label} />
    </HoverCard>
  );
}

export function ProjectRail({
  users,
  projects,
  scope,
  selectedUserId,
  onSelectScope,
  onSelectUser,
  onConversationCreated,
  mobileView,
}: {
  users: RailUser[];
  projects: RailProject[];
  scope: RailScope;
  selectedUserId?: string | null;
  onSelectScope: (scope: RailScope) => void;
  onSelectUser: (userId: string) => void;
  onConversationCreated: (threadId: string) => void;
  mobileView: "list" | "conversation" | "info";
}) {
  const [recipients, setRecipients] = useState<CollaboratorSearchPerson[]>([]);
  const [pendingRecipientId, setPendingRecipientId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  // El buscador (Kbar compartido con el gestor de proyectos) necesita la
  // lista completa de destinatarios elegibles de una vez — a diferencia de
  // NewConversationModal (que la recarga cada vez que abre), aquí se pide
  // una sola vez al montar el riel; si falla queda en [] y
  // CollaboratorSearchModal deshabilita el trigger automáticamente.
  useEffect(() => {
    (async () => {
      try {
        const result = await getEligibleRecipients();
        if (result.ok) {
          setRecipients(
            result.recipients.map((recipient) => ({
              id: recipient.id,
              name: recipient.name,
              username: recipient.username,
              headline: recipient.headline,
            })),
          );
        }
      } catch {
        // Silencioso: el trigger queda deshabilitado con people=[].
      }
    })();
  }, []);

  const handleRecipientSelected = (personId: string) => {
    setPendingRecipientId(personId);
    setNewChatOpen(true);
  };

  return (
    <Column
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      overflow="hidden"
      overflowY="auto"
      gap="8"
      paddingY="12"
      horizontal="center"
      style={{ width: 64, minWidth: 0, flexShrink: 0 }}
      s={mobileView !== "list" ? { hide: true } : undefined}
      xs={mobileView !== "list" ? { hide: true } : undefined}
    >
      <IconButton icon="person" size="s" variant="tertiary" tooltip="Usuarios" disabled />

      {users.map((user) => {
        const active = scope.type === "direct" && selectedUserId === user.id;
        const state = presenceOf(user);
        return (
          <RailTooltip key={user.id} label={user.name}>
            <Row
              center
              radius="full"
              cursor="interactive"
              background={active ? "brand-alpha-weak" : "transparent"}
              border={active ? "brand-medium" : "transparent"}
              onClick={() => onSelectUser(user.id)}
              style={{ width: TAB_SIZE, height: TAB_SIZE }}
            >
              <Avatar
                size="s"
                {...(user.avatarUrl
                  ? { src: user.avatarUrl }
                  : { value: user.name.charAt(0).toUpperCase() })}
                statusIndicator={{ color: presenceColor(state) }}
              />
            </Row>
          </RailTooltip>
        );
      })}

      <CollaboratorSearchModal
        people={recipients}
        onSelect={handleRecipientSelected}
        trigger={
          <IconButton
            icon="plus"
            size="s"
            variant="tertiary"
            tooltip="Nuevo chat"
            tooltipPosition="right"
          />
        }
      />

      <Line background="neutral-alpha-weak" style={{ width: 32 }} />

      <IconButton icon="briefcase" size="s" variant="tertiary" tooltip="Proyectos" disabled />

      {projects.map((project) => {
        const active = sameScope(scope, { type: "project", id: project.id });
        return (
          <RailTooltip key={project.id} label={project.title}>
            <Row
              center
              radius="full"
              cursor="interactive"
              background={active ? "brand-alpha-weak" : "transparent"}
              border={active ? "brand-medium" : "transparent"}
              onClick={() => onSelectScope({ type: "project", id: project.id })}
              style={{ width: TAB_SIZE, height: TAB_SIZE }}
            >
              <Avatar
                size="s"
                {...(project.logoUrl
                  ? { src: project.logoUrl }
                  : { value: project.title.charAt(0).toUpperCase() })}
              />
            </Row>
          </RailTooltip>
        );
      })}

      <NewConversationModal
        isOpen={newChatOpen}
        initialRecipientId={pendingRecipientId}
        onClose={() => {
          setNewChatOpen(false);
          setPendingRecipientId(null);
        }}
        onCreated={(threadId) => {
          setNewChatOpen(false);
          setPendingRecipientId(null);
          onConversationCreated(threadId);
        }}
      />
    </Column>
  );
}
