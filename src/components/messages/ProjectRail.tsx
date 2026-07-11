"use client";

import { Avatar, Column, IconButton, Line, Row } from "@once-ui-system/core";
import { presenceColor, presenceOf, type RailScope, sameScope } from "./messengerUtils";

/* ══ Riel vertical: dos secciones — Usuarios (hilos directos) y Proyectos ══
   (2026-07-11, rediseño de /mensajes). Cada sección tiene un icono de
   cabecera (IconButton con tooltip nativo, no interactivo — solo etiqueta)
   y debajo los avatares/logos correspondientes. El tooltip de cada
   avatar/logo reutiliza el patrón nativo `title` que ya usaba este mismo
   componente (Once UI no expone un wrapper de tooltip público reusable
   fuera de IconButton/Tag; su Tooltip interno no está exportado del
   paquete). Seleccionar un avatar cambia el scope de MessengerView y, para
   usuarios, además abre directamente ese hilo. ═══════════════════════════ */

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

export function ProjectRail({
  users,
  projects,
  scope,
  selectedUserId,
  onSelectScope,
  onSelectUser,
  mobileView,
}: {
  users: RailUser[];
  projects: RailProject[];
  scope: RailScope;
  selectedUserId?: string | null;
  onSelectScope: (scope: RailScope) => void;
  onSelectUser: (userId: string) => void;
  mobileView: "list" | "conversation" | "info";
}) {
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
          <Row
            key={user.id}
            center
            radius="full"
            cursor="interactive"
            background={active ? "brand-alpha-weak" : "transparent"}
            border={active ? "brand-medium" : "transparent"}
            onClick={() => onSelectUser(user.id)}
            title={user.name}
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
        );
      })}

      <Line background="neutral-alpha-weak" style={{ width: 32 }} />

      <IconButton icon="briefcase" size="s" variant="tertiary" tooltip="Proyectos" disabled />

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
            onClick={() => onSelectScope({ type: "project", id: project.id })}
            title={project.title}
            style={{ width: TAB_SIZE, height: TAB_SIZE }}
          >
            <Avatar
              size="s"
              {...(project.logoUrl
                ? { src: project.logoUrl }
                : { value: project.title.charAt(0).toUpperCase() })}
            />
          </Row>
        );
      })}
    </Column>
  );
}
