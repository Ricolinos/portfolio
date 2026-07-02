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
  Media,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
} from "@once-ui-system/core";

const TABS = ["Trabajo", "Servicios", "Estadísticas"] as const;

interface PortfolioProject {
  id: string;
  title: string;
  image: string;
  tag: string;
  views: number;
  likes: number;
}

const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  { id: "aurora", title: "Aurora — Identidad Visual", image: "/images/gallery/img-01.jpg", tag: "Branding", views: 18400, likes: 2380 },
  { id: "nocturna", title: "Nocturna — Serie Editorial", image: "/images/gallery/img-02.jpg", tag: "Ilustración", views: 12200, likes: 1540 },
  { id: "vela", title: "Sistema Tipográfico Vela", image: "/images/gallery/img-03.jpg", tag: "Tipografía", views: 9600, likes: 980 },
  { id: "fintech", title: "Rediseño App Fintech", image: "/images/gallery/img-04.jpg", tag: "UI/UX", views: 15800, likes: 2010 },
  { id: "litho", title: "Campaña Verano Litho", image: "/images/gallery/img-05.jpg", tag: "Fotografía", views: 7300, likes: 640 },
];

const EXPERIENCE = [
  { company: "Estudio Litho", role: "Diseñador Senior", period: "2023 — Presente" },
  { company: "Aurora Studio", role: "Diseñador de Producto", period: "2021 — 2023" },
  { company: "Freelance", role: "Diseñador Gráfico", period: "2019 — 2021" },
];

const METRICS = [
  { label: "Vistas del perfil", value: "24.3K" },
  { label: "Seguidores", value: "1,204" },
  { label: "Apreciaciones", value: "3,890" },
];

function formatCount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value}`;
}

interface ProfileViewProps {
  displayName: string;
  avatarUrl?: string;
  isOwnProfile: boolean;
}

export function ProfileView({ displayName, avatarUrl, isOwnProfile }: ProfileViewProps) {
  const [tab, setTab] = useState<string>(TABS[0]);

  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = avatarUrl ? { src: avatarUrl } : { value: initials };

  return (
    <RevealFx fillWidth revealedByDefault>
      <Column fillWidth maxWidth="l" horizontal="center" paddingBottom="80">
        <Column fillWidth paddingX="32" paddingTop="24" gap="0">

          {/* ── Banner de cobertura ─────────────────────────────────────────── */}
          <Flex fillWidth height="160" radius="l" background="brand-alpha-weak" />

          {/* ── Layout asimétrico de dos columnas ──────────────────────────── */}
          <Row fillWidth gap="32" s={{ direction: "column" }} vertical="start">

            {/* Columna izquierda — identidad, métricas y experiencia */}
            <Column gap="24" fillWidth style={{ maxWidth: 320 }}>
              <Flex style={{ marginTop: "-48px" }}>
                <Avatar {...avatarProps} size="xl" />
              </Flex>

              <Column gap="8">
                <Heading variant="heading-strong-l">{displayName}</Heading>
                <Row gap="8" vertical="center">
                  <Icon name="briefcase" size="s" onBackground="neutral-weak" />
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    Diseñador de Producto
                  </Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Icon name="mapPin" size="s" onBackground="neutral-weak" />
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    Ciudad de México, MX
                  </Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Icon name="openLink" size="s" onBackground="neutral-weak" />
                  <Text variant="body-default-m" onBackground="neutral-weak">
                    portfolio.ejemplo.com
                  </Text>
                </Row>
              </Column>

              {isOwnProfile && (
                <Column gap="8" fillWidth>
                  <Button fillWidth variant="primary">Editar información de perfil</Button>
                  <Button fillWidth variant="secondary">Personalizar perfil</Button>
                </Column>
              )}

              <Flex
                background="neutral-alpha-weak"
                padding="16"
                radius="m"
                border="neutral-alpha-weak"
                direction="column"
                gap="12"
              >
                {METRICS.map((metric) => (
                  <Row key={metric.label} fillWidth horizontal="between">
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {metric.label}
                    </Text>
                    <Text variant="label-strong-s">{metric.value}</Text>
                  </Row>
                ))}
              </Flex>

              <Flex
                background="neutral-alpha-weak"
                padding="16"
                radius="m"
                border="neutral-alpha-weak"
                direction="column"
                gap="12"
              >
                <Text variant="label-strong-s">Experiencia</Text>
                <Column gap="12">
                  {EXPERIENCE.map((exp) => (
                    <Row key={exp.company} gap="12" vertical="start">
                      <Avatar value={exp.company[0]} size="s" radius="s" />
                      <Column gap="2">
                        <Text variant="label-default-s" onBackground="neutral-strong">
                          {exp.role}
                        </Text>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {exp.company} · {exp.period}
                        </Text>
                      </Column>
                    </Row>
                  ))}
                </Column>
              </Flex>
            </Column>

            {/* Columna derecha — showcase de portafolio */}
            <Column gap="24" fillWidth>
              <SegmentedControl
                selected={tab}
                onToggle={setTab}
                buttons={TABS.map((t) => ({ value: t, label: t }))}
              />

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

              <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="20" fillWidth>
                {PORTFOLIO_PROJECTS.map((project) => (
                  <Card
                    key={project.id}
                    fillWidth
                    direction="column"
                    gap="12"
                    padding="12"
                    radius="l"
                    border="neutral-alpha-weak"
                  >
                    <Column fillWidth radius="m" overflow="hidden">
                      <Media
                        src={project.image}
                        alt={project.title}
                        aspectRatio="4 / 3"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </Column>
                    <Column fillWidth gap="8" paddingX="4" paddingBottom="4">
                      <Row fillWidth horizontal="between" vertical="start" gap="8">
                        <Text variant="heading-strong-s" onBackground="neutral-strong" wrap="balance">
                          {project.title}
                        </Text>
                        <Tag size="s" label={project.tag} variant="neutral" />
                      </Row>
                      <Row gap="12" vertical="center">
                        <Row gap="4" vertical="center">
                          <Icon name="eye" size="xs" onBackground="neutral-weak" />
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            {formatCount(project.views)}
                          </Text>
                        </Row>
                        <Row gap="4" vertical="center">
                          <Icon name="heart" size="xs" onBackground="neutral-weak" />
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            {formatCount(project.likes)}
                          </Text>
                        </Row>
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
            </Column>

          </Row>
        </Column>
      </Column>
    </RevealFx>
  );
}
