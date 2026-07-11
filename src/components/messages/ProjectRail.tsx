"use client";

import { Avatar, Column, Icon, Row } from "@once-ui-system/core";
import { type RailScope, sameScope } from "./messengerUtils";

/* ══ Riel vertical de proyectos: tarjeta angosta a la izquierda de Chats ═══
   Pestaña "Directos" + una pestaña circular por proyecto activo (derivadas
   del inbox, sin backend nuevo). Seleccionar una pestaña cambia el scope
   que MessengerView usa para filtrar ConversationList. ═══════════════════ */

export interface RailProject {
  id: string;
  title: string;
}

const TAB_SIZE = 44;

export function ProjectRail({
  projects,
  scope,
  onSelect,
  mobileView,
}: {
  projects: RailProject[];
  scope: RailScope;
  onSelect: (scope: RailScope) => void;
  mobileView: "list" | "conversation" | "info";
}) {
  const directActive = scope.type === "direct";

  return (
    <Column
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      overflow="hidden"
      gap="8"
      paddingY="12"
      horizontal="center"
      style={{ width: 64, minWidth: 0, flexShrink: 0 }}
      s={mobileView !== "list" ? { hide: true } : undefined}
      xs={mobileView !== "list" ? { hide: true } : undefined}
    >
      <Row
        center
        radius="full"
        cursor="interactive"
        background={directActive ? "brand-alpha-weak" : "transparent"}
        border={directActive ? "brand-medium" : "transparent"}
        onClick={() => onSelect({ type: "direct" })}
        title="Mensajes directos"
        style={{ width: TAB_SIZE, height: TAB_SIZE }}
      >
        <Icon name="email" size="s" onBackground={directActive ? "brand-strong" : "neutral-weak"} />
      </Row>

      {projects.map((project) => {
        const active = sameScope(scope, { type: "project", id: project.id });
        return (
          <Row
            key={project.id}
            center
            radius="full"
            cursor="interactive"
            background={active ? "brand-alpha-weak" : "transparent"}
            border={active ? "brand-medium" : "transparent"}
            onClick={() => onSelect({ type: "project", id: project.id })}
            title={project.title}
            style={{ width: TAB_SIZE, height: TAB_SIZE }}
          >
            <Avatar size="s" value={project.title.charAt(0).toUpperCase()} />
          </Row>
        );
      })}
    </Column>
  );
}
