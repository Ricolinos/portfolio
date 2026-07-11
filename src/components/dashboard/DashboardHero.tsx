import { Background, Column, Heading, Text } from "@once-ui-system/core";

/* ══ Hero institucional de ambos dashboards (Fase 6b) ══════════════════
   Mismo componente para /dashboard/client y /dashboard/collaborator: solo
   cambia la copia según el rol. Presentacional puro (sin estado), así que
   no necesita "use client". ═════════════════════════════════════════════ */

type DashboardRole = "client" | "collaborator";

const ROLE_COPY: Record<DashboardRole, { eyebrow: string; message: string }> = {
  client: {
    eyebrow: "Panel de cliente",
    message:
      "Sigue el avance de tus proyectos conjuntos, revisa tareas por aprobar y coordínate con tus partners.",
  },
  collaborator: {
    eyebrow: "Panel de partner",
    message:
      "Revisa tus proyectos activos, tus tareas asignadas y las solicitudes de contacto de nuevos clientes.",
  },
};

export function DashboardHero({
  name,
  viewerRole,
}: {
  name: string | null;
  viewerRole: DashboardRole;
}) {
  const copy = ROLE_COPY[viewerRole];
  const greetingName = name?.split(" ")[0] ?? (viewerRole === "client" ? "cliente" : "partner");

  return (
    <Column
      fillWidth
      overflow="hidden"
      radius="xl"
      border="neutral-alpha-weak"
      background="surface"
      paddingY="40"
      paddingX="32"
      gap="8"
    >
      <Background
        position="absolute"
        top="0"
        left="0"
        fill
        pointerEvents="none"
        gradient={{
          display: true,
          opacity: 60,
          x: 100,
          y: 0,
          width: 150,
          height: 100,
          tilt: 0,
          colorStart: "brand-alpha-medium",
          colorEnd: "static-transparent",
        }}
      />
      <Text variant="label-default-s" onBackground="brand-medium" zIndex={1}>
        {copy.eyebrow}
      </Text>
      <Heading variant="display-strong-xs" zIndex={1}>
        Hola, {greetingName}
      </Heading>
      <Text
        variant="body-default-m"
        onBackground="neutral-weak"
        zIndex={1}
        style={{ maxWidth: "40rem" }}
      >
        {copy.message}
      </Text>
    </Column>
  );
}
