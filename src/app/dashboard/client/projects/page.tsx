"use client";

import {
  Badge,
  ClientGrid,
  Column,
  Heading,
  Line,
  OgCard,
  ProgressBar,
  Row,
  Text,
} from "@once-ui-system/core";

type ProjectStatus = "active" | "review" | "paused";

interface Project {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  progress: number;
  status: ProjectStatus;
}

const PROJECTS: Project[] = [
  {
    id: "proj-1",
    title: "Rediseño de Identidad Visual",
    description:
      "Actualización completa del sistema de identidad: logotipo, tipografía, paleta de colores y guías de marca.",
    dueDate: "15 ago 2026",
    progress: 70,
    status: "active",
  },
  {
    id: "proj-2",
    title: "Campaña de Lanzamiento Digital",
    description:
      "Diseño de materiales para redes sociales, banners web y motion graphics para la campaña de producto.",
    dueDate: "30 sep 2026",
    progress: 35,
    status: "review",
  },
  {
    id: "proj-3",
    title: "Ilustraciones para Catálogo 2026",
    description:
      "Serie de ilustraciones editoriales para catálogo impreso y digital de temporada otoño-invierno.",
    dueDate: "10 oct 2026",
    progress: 15,
    status: "active",
  },
];

const STATUS_MAP: Record<ProjectStatus, { label: string }> = {
  active:  { label: "En progreso" },
  review:  { label: "En revisión" },
  paused:  { label: "Pausado"     },
};

export default function ClientProjectsPage() {
  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Mis Proyectos</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Seguimiento de tus proyectos activos.
        </Text>
      </Column>

      {/* ── Cuadrícula: 3 col desktop → 1 col móvil ───────────────────────── */}
      <ClientGrid
        columns="3"
        s={{ columns: 1 }}
        style={{ width: "100%", gap: "var(--static-space-24)" }}
      >
        {PROJECTS.map((project) => (
          <Column key={project.id} fillWidth gap="0">

            {/* OgCard con datos del proyecto — sin imagen, favicon ni enlace */}
            <OgCard
              ogData={{
                title: project.title,
                description: project.description,
              }}
              image={false}
              favicon={false}
              cardUrl={false}
              size="m"
              fillWidth
              style={{
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                borderBottom: "none",
              }}
            />

            {/* Sección inferior: progreso + metadatos */}
            <Column
              paddingX="20"
              paddingY="16"
              gap="12"
              border="neutral-alpha-medium"
              style={{
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderBottomLeftRadius:  "var(--radius-l)",
                borderBottomRightRadius: "var(--radius-l)",
              }}
            >
              <Column gap="8" fillWidth>
                <Row fillWidth horizontal="between" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    Progreso
                  </Text>
                  <Text variant="label-strong-s">{project.progress}%</Text>
                </Row>
                <ProgressBar value={project.progress} fillWidth />
              </Column>

              <Line background="neutral-alpha-weak" />

              <Row fillWidth horizontal="between" vertical="center">
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Entrega: {project.dueDate}
                </Text>
                <Badge title={STATUS_MAP[project.status].label} />
              </Row>
            </Column>

          </Column>
        ))}
      </ClientGrid>
    </Column>
  );
}
