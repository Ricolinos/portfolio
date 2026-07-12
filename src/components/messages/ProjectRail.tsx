"use client";

import { Avatar, Column, HoverCard, IconButton, Line, Row, Tooltip } from "@once-ui-system/core";
import { type ReactNode, useState } from "react";
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
   además abre directamente ese hilo. El botón "+" de la sección Usuarios
   abre un buscador de colaboradores elegibles y arranca un hilo nuevo. ══ */

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
  const [newChatOpen, setNewChatOpen] = useState(false);

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

      <IconButton
        icon="plus"
        size="s"
        variant="tertiary"
        tooltip="Nuevo chat"
        tooltipPosition="right"
        onClick={() => setNewChatOpen(true)}
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
        onClose={() => setNewChatOpen(false)}
        onCreated={(threadId) => {
          setNewChatOpen(false);
          onConversationCreated(threadId);
        }}
      />
    </Column>
  );
}
