"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Column,
  Flex,
  Grid,
  Heading,
  Icon,
  IconButton,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@once-ui-system/core";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/projectStatus";

export interface PartnerProject {
  id: string;
  title: string;
  clientName: string | null;
  status: string;
  currency: string;
  total: number | null;
  updatedAt: string; // ISO string
}

interface ProfileViewProps {
  displayName: string;
  avatarUrl?: string;
  isOwnProfile: boolean;
  username: string;
  whatsapp?: string | null;
  email?: string | null;
  memberSince?: string; // ISO string
  projects: PartnerProject[];
}

const IN_PROGRESS: ProjectStatus[] = ["draft", "sent", "active"];

const FILTERS = [
  { value: "all", label: "Todos" },
  { value: "progress", label: "En curso" },
  { value: "done", label: "Completados" },
] as const;

const STATUS_VARIANTS: Record<ProjectStatus, "neutral" | "info" | "warning" | "success"> = {
  draft: "neutral",
  sent: "info",
  active: "warning",
  completed: "success",
  archived: "neutral",
};

function waLink(whatsapp: string) {
  return `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
}

function formatTotal(total: number | null, currency: string) {
  if (total === null) return "Por definir";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(total);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export function ProfileView({
  displayName,
  avatarUrl,
  isOwnProfile,
  username,
  whatsapp,
  email,
  memberSince,
  projects,
}: ProfileViewProps) {
  const [filter, setFilter] = useState<string>(FILTERS[0].value);

  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = avatarUrl ? { src: avatarUrl } : { value: initials };

  const inProgress = projects.filter((p) => IN_PROGRESS.includes(p.status as ProjectStatus));
  const completed = projects.filter((p) => p.status === "completed");
  const clients = new Set(projects.map((p) => p.clientName).filter(Boolean));
  const billed = projects.reduce((sum, p) => sum + (p.total ?? 0), 0);

  const visibleProjects =
    filter === "progress" ? inProgress : filter === "done" ? completed : projects;

  const metrics = [
    { label: "En curso", value: String(inProgress.length) },
    { label: "Completados", value: String(completed.length) },
    { label: "Clientes", value: String(clients.size) },
    // Monto facturado: solo visible para el dueño del perfil.
    ...(isOwnProfile
      ? [{ label: "Facturado", value: formatTotal(billed, projects[0]?.currency ?? "MXN") }]
      : []),
  ];

  return (
    <RevealFx fillWidth revealedByDefault>
      <Column fillWidth maxWidth="l" horizontal="center" paddingBottom="80">
        <Column fillWidth paddingX="32" paddingTop="24" gap="0">

          {/* ── Banner de cobertura ─────────────────────────────────────────── */}
          <Flex fillWidth height="160" radius="l" background="brand-alpha-weak" />

          {/* ── Layout asimétrico de dos columnas ──────────────────────────── */}
          <Row fillWidth gap="32" s={{ direction: "column" }} vertical="start">

            {/* Columna izquierda — identidad, contacto y métricas */}
            <Column gap="24" fillWidth style={{ maxWidth: 320 }}>
              <Flex style={{ marginTop: "-48px" }}>
                <Avatar {...avatarProps} size="xl" />
              </Flex>

              <Column gap="8">
                <Heading variant="heading-strong-l">{displayName}</Heading>
                <Row gap="8" vertical="center">
                  <Tag size="s" variant="brand" label="Partner" />
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    @{username}
                  </Text>
                </Row>
                {memberSince && (
                  <Row gap="8" vertical="center">
                    <Icon name="calendar" size="s" onBackground="neutral-weak" />
                    <Text variant="body-default-m" onBackground="neutral-weak">
                      Partner desde {formatMemberSince(memberSince)}
                    </Text>
                  </Row>
                )}
                {isOwnProfile && email && (
                  <Row gap="8" vertical="center">
                    <Icon name="email" size="s" onBackground="neutral-weak" />
                    <Text variant="body-default-m" onBackground="neutral-weak">
                      {email}
                    </Text>
                  </Row>
                )}
              </Column>

              {isOwnProfile ? (
                <Column gap="8" fillWidth>
                  <Button fillWidth variant="primary" href="/dashboard/collaborator">
                    Ir a mi panel
                  </Button>
                  <Button fillWidth variant="secondary" href="/dashboard/client/settings">
                    Editar información de perfil
                  </Button>
                </Column>
              ) : (
                whatsapp && (
                  <Button fillWidth variant="primary" href={waLink(whatsapp)} prefixIcon="whatsapp">
                    Contactar por WhatsApp
                  </Button>
                )
              )}

              <Flex
                background="neutral-alpha-weak"
                padding="16"
                radius="m"
                border="neutral-alpha-weak"
                direction="column"
                gap="12"
              >
                {metrics.map((metric) => (
                  <Row key={metric.label} fillWidth horizontal="between">
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {metric.label}
                    </Text>
                    <Text variant="label-strong-s">{metric.value}</Text>
                  </Row>
                ))}
              </Flex>

              {clients.size > 0 && (
                <Flex
                  background="neutral-alpha-weak"
                  padding="16"
                  radius="m"
                  border="neutral-alpha-weak"
                  direction="column"
                  gap="12"
                >
                  <Text variant="label-strong-s">Clientes</Text>
                  <Column gap="12">
                    {[...clients].map((client) => (
                      <Row key={client} gap="12" vertical="center">
                        <Avatar value={(client as string)[0].toUpperCase()} size="s" radius="s" />
                        <Text variant="label-default-s" onBackground="neutral-strong">
                          {client}
                        </Text>
                      </Row>
                    ))}
                  </Column>
                </Flex>
              )}
            </Column>

            {/* Columna derecha — showcase de proyectos reales */}
            <Column gap="24" fillWidth paddingTop="24">
              <SegmentedControl
                selected={filter}
                onToggle={setFilter}
                buttons={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
              />

              {isOwnProfile && (
                <Flex
                  background="brand-alpha-weak"
                  padding="20"
                  radius="m"
                  fillWidth
                  vertical="center"
                  horizontal="between"
                  gap="16"
                  s={{ direction: "column", horizontal: "start" }}
                >
                  <Column gap="4">
                    <Text variant="heading-strong-s">Impulsa tus proyectos</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Llega a más clientes destacando tu trabajo en la portada de Explorar.
                    </Text>
                  </Column>
                  <Button variant="primary" size="m">Probar Pro</Button>
                </Flex>
              )}

              {visibleProjects.length === 0 && !isOwnProfile ? (
                <Column fillWidth horizontal="center" gap="12" padding="48" border="neutral-alpha-medium" radius="l">
                  <Icon name="sparkles" size="l" onBackground="neutral-weak" />
                  <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                    Sin proyectos en esta vista.
                  </Text>
                </Column>
              ) : (
                <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="20" fillWidth>
                  {visibleProjects.map((project) => (
                    <Card
                      key={project.id}
                      fillWidth
                      direction="column"
                      gap="12"
                      padding="12"
                      radius="l"
                      border="neutral-alpha-weak"
                    >
                      {/* Sin modelo de imágenes de portafolio aún: bloque de marca */}
                      <Flex
                        fillWidth
                        radius="m"
                        background="brand-alpha-weak"
                        center
                        style={{ aspectRatio: "4 / 3" }}
                      >
                        <Icon name="paintBrush" size="l" onBackground="brand-weak" />
                      </Flex>
                      <Column fillWidth gap="8" paddingX="4" paddingBottom="4">
                        <Row fillWidth horizontal="between" vertical="start" gap="8">
                          <Text variant="heading-strong-s" onBackground="neutral-strong" wrap="balance">
                            {project.title}
                          </Text>
                          <Tag
                            size="s"
                            variant={STATUS_VARIANTS[project.status as ProjectStatus] ?? "neutral"}
                            label={STATUS_LABELS[project.status as ProjectStatus] ?? project.status}
                          />
                        </Row>
                        <Row fillWidth horizontal="between" vertical="center">
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            {project.clientName ?? "Sin cliente asignado"}
                          </Text>
                          <IconButton
                            icon="infoCircle"
                            size="s"
                            variant="tertiary"
                            tooltip={
                              isOwnProfile
                                ? `Total: ${formatTotal(project.total, project.currency)} · Actualizado: ${formatDate(project.updatedAt)}`
                                : `Actualizado: ${formatDate(project.updatedAt)}`
                            }
                            tooltipPosition="top"
                          />
                        </Row>
                      </Column>
                    </Card>
                  ))}

                  {/* Tarjeta de acción "Crear un proyecto" */}
                  {isOwnProfile && (
                    <Flex
                      border="neutral-medium"
                      radius="l"
                      style={{ borderStyle: "dashed" }}
                      center
                      padding="40"
                      direction="column"
                      gap="12"
                    >
                      <Icon name="plus" size="l" onBackground="neutral-weak" />
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        Crear un proyecto
                      </Text>
                    </Flex>
                  )}
                </Grid>
              )}
            </Column>

          </Row>
        </Column>
      </Column>
    </RevealFx>
  );
}
