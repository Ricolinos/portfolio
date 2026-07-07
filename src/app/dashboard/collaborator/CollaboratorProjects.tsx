"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Column,
  Grid,
  Heading,
  Icon,
  Line,
  Row,
  Select,
  Text,
  useToast,
} from "@once-ui-system/core";
import { updateProjectStatus } from "@/app/actions/projects";
import { PROJECT_STATUSES, STATUS_LABELS, type ProjectStatus } from "@/lib/projectStatus";

// Contrato server→client serializado (Decimal→number, Date→ISO).
export interface CollaboratorProjectItem {
  id: string;
  title: string;
  clientName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  status: string;
  currency: string;
  total: number | null;
  updatedAt: string;
}

const STATUS_OPTIONS = PROJECT_STATUSES.map((status) => ({
  label: STATUS_LABELS[status],
  value: status,
}));

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

export default function CollaboratorProjects({
  projects,
}: {
  projects: CollaboratorProjectItem[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [, startTransition] = useTransition();

  const handleStatusChange = (projectId: string, status: string) => {
    startTransition(async () => {
      try {
        await updateProjectStatus(projectId, status);
        addToast({
          variant: "success",
          message: `Estatus actualizado a "${STATUS_LABELS[status as ProjectStatus] ?? status}"`,
        });
        router.refresh();
      } catch (error) {
        addToast({
          variant: "danger",
          message:
            error instanceof Error && error.message
              ? error.message
              : "No se pudo actualizar el estatus",
        });
      }
    });
  };

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Panel de Partner</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Gestiona el estatus de los proyectos de tus clientes.
        </Text>
      </Column>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
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
              Aún no hay proyectos
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" align="center">
              Cuando un cliente genere una cotización aparecerá aquí.
            </Text>
          </Column>
        </Column>
      ) : (

      /* ── Cuadrícula: 3 col desktop → 1 col móvil ───────────────────────── */
      <Grid columns="3" s={{ columns: 1 }} fillWidth gap="24">
        {projects.map((project) => (
          <Column
            key={project.id}
            fillWidth
            border="neutral-alpha-medium"
            radius="l"
            paddingX="20"
            paddingY="16"
            gap="12"
          >
            <Column gap="4">
              <Heading variant="heading-strong-s">{project.title}</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Cliente: {project.clientName ?? project.ownerName ?? project.ownerEmail}
              </Text>
            </Column>

            <Line background="neutral-alpha-weak" />

            <Row fillWidth horizontal="between" vertical="center">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Total ({project.currency})
              </Text>
              <Text variant="label-strong-s">
                {formatTotal(project.total, project.currency)}
              </Text>
            </Row>

            <Row fillWidth horizontal="between" vertical="center">
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Actualizado: {formatDate(project.updatedAt)}
              </Text>
            </Row>

            <Select
              id={`status-${project.id}`}
              label="Estatus"
              options={STATUS_OPTIONS}
              value={project.status}
              onSelect={(v) => handleStatusChange(project.id, v)}
              fillWidth
            />
          </Column>
        ))}
      </Grid>
      )}
    </Column>
  );
}
