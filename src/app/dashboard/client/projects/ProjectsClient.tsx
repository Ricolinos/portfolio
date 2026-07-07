"use client";

import {
  Badge,
  Button,
  Column,
  Grid,
  Heading,
  Icon,
  Line,
  OgCard,
  Row,
  Text,
} from "@once-ui-system/core";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/projectStatus";

export interface ProjectItem {
  id: string;
  title: string;
  clientName: string | null;
  status: string;
  currency: string;
  total: number | null;
  updatedAt: string; // ISO string
}

interface ProjectsClientProps {
  projects: ProjectItem[];
}

function formatTotal(total: number | null, currency: string) {
  if (total === null) return "Por definir";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(total);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Mis Proyectos</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Seguimiento de tus proyectos activos.
        </Text>
      </Column>

      {/* ── Empty state: sin proyectos todavía ────────────────────────────── */}
      {projects.length === 0 ? (
        <Column
          fillWidth
          horizontal="center"
          align="center"
          gap="20"
          padding="64"
          border="neutral-alpha-medium"
          radius="l"
        >
          <Icon name="sparkles" size="l" onBackground="neutral-weak" />
          <Column gap="8" horizontal="center">
            <Heading variant="heading-strong-m" align="center">
              Aún no tienes proyectos
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" align="center">
              Cotiza tu primera idea y la hacemos realidad.
            </Text>
          </Column>
          <Button href="/servicios/cotizador" variant="primary" size="m" prefixIcon="plus">
            Crear mi primera cotización
          </Button>
        </Column>
      ) : (

      /* ── Cuadrícula: 3 col desktop → 1 col móvil ───────────────────────── */
      <Grid columns="3" s={{ columns: 1 }} fillWidth gap="24">
        {projects.map((project) => (
          <Column key={project.id} fillWidth gap="0">

            {/* OgCard con datos del proyecto — sin imagen, favicon ni enlace */}
            <OgCard
              ogData={{
                title: project.title,
                description: project.clientName
                  ? `Cliente: ${project.clientName}`
                  : "Sin cliente asignado",
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

            {/* Sección inferior: total + metadatos */}
            <Column
              paddingX="20"
              paddingY="16"
              gap="12"
              border="neutral-alpha-medium"
              bottomRadius="l"
            >
              <Row fillWidth horizontal="between" vertical="center">
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Total ({project.currency})
                </Text>
                <Text variant="label-strong-s">
                  {formatTotal(project.total, project.currency)}
                </Text>
              </Row>

              <Line background="neutral-alpha-weak" />

              <Row fillWidth horizontal="between" vertical="center">
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Actualizado: {formatDate(project.updatedAt)}
                </Text>
                <Badge title={STATUS_LABELS[project.status as ProjectStatus] ?? project.status} />
              </Row>
            </Column>

          </Column>
        ))}
      </Grid>
      )}
    </Column>
  );
}
