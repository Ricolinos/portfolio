"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Column,
  ContextMenu,
  Grid,
  Heading,
  Icon,
  IconButton,
  Line,
  Option,
  RevealFx,
  Row,
  Tag,
  Text,
} from "@once-ui-system/core";
import { STATUS_LABELS, type ProjectStatus } from "@/lib/projectStatus";
import { RESOURCE_CATEGORY_SLUGS } from "@/components/resources/categories";
import { AvatarUploadDialog, EditInfoDialog } from "./ClientProfileEditDialogs";
import styles from "./ClientProfileView.module.scss";

export interface ClientProject {
  id: string;
  title: string;
  status: string;
  currency: string;
  total: number | null;
  updatedAt: string; // ISO string
}

export interface ClientDesigner {
  username: string | null;
  name: string | null;
  imageUrl: string | null;
  whatsapp: string | null;
}

interface ClientProfileViewProps {
  displayName: string;
  avatarUrl?: string;
  isOwnProfile: boolean;
  email?: string | null;
  whatsapp?: string | null;
  secondaryEmail?: string | null;
  address?: string | null;
  company?: string | null;
  brand?: string | null;
  motto?: string | null;
  projects: ClientProject[];
  designers: ClientDesigner[];
}

// Colores tipo tablero Monday: en progreso ámbar, completado verde, enviada azul.
const STATUS_VARIANTS: Record<ProjectStatus, "neutral" | "info" | "warning" | "success"> = {
  draft: "neutral",
  sent: "info",
  active: "warning",
  completed: "success",
  archived: "neutral",
};

const IN_PROGRESS: ProjectStatus[] = ["draft", "sent", "active"];

const QUICK_ACCESS = [
  {
    icon: "search",
    title: "Buscar talento",
    description: "Encuentra diseñadores para tu próximo proyecto.",
    href: "/explorar",
  },
  {
    icon: "plus",
    title: "Nuevo proyecto",
    description: "Cotiza una nueva idea en minutos.",
    href: "/servicios/cotizador",
  },
  {
    icon: "download",
    title: "Recursos",
    description: "Materiales compartidos por tus diseñadores.",
    href: "/recursos",
  },
] as const;

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

function ProjectRow({ project, designer }: { project: ClientProject; designer?: ClientDesigner }) {
  const status = project.status as ProjectStatus;

  return (
    <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" gap="16">
      <Row gap="12" vertical="center">
        <Icon name="briefcase" size="s" onBackground="neutral-weak" />
        <Text variant="label-default-m" onBackground="neutral-strong">
          {project.title}
        </Text>
      </Row>

      <Row gap="8" vertical="center">
        <Tag size="s" variant={STATUS_VARIANTS[status] ?? "neutral"} label={STATUS_LABELS[status] ?? project.status} />
        <IconButton
          icon="infoCircle"
          size="s"
          variant="tertiary"
          tooltip={`Total: ${formatTotal(project.total, project.currency)} · Actualizado: ${formatDate(project.updatedAt)}`}
          tooltipPosition="top"
        />
        {designer?.whatsapp && (
          <IconButton
            icon="whatsapp"
            size="s"
            variant="tertiary"
            href={waLink(designer.whatsapp)}
            tooltip={`Contactar a ${designer.name ?? "tu diseñador"}`}
            tooltipPosition="top"
          />
        )}
      </Row>
    </Row>
  );
}

function ProjectGroup({
  title,
  variant,
  projects,
  designer,
}: {
  title: string;
  variant: "warning" | "success";
  projects: ClientProject[];
  designer?: ClientDesigner;
}) {
  if (projects.length === 0) return null;

  return (
    <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
      <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" background="neutral-alpha-weak">
        <Row gap="8" vertical="center">
          <Tag size="s" variant={variant} label={title} />
        </Row>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </Text>
      </Row>
      {projects.map((project) => (
        <Column key={project.id} fillWidth>
          <Line background="neutral-alpha-weak" />
          <ProjectRow project={project} designer={designer} />
        </Column>
      ))}
    </Column>
  );
}

export function ClientProfileView({
  displayName,
  avatarUrl,
  isOwnProfile,
  email,
  whatsapp,
  secondaryEmail,
  address,
  company,
  brand,
  motto,
  projects,
  designers,
}: ClientProfileViewProps) {
  const [openDialog, setOpenDialog] = useState<"avatar" | "info" | null>(null);
  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = avatarUrl ? { src: avatarUrl } : { value: initials };

  const inProgress = projects.filter((p) => IN_PROGRESS.includes(p.status as ProjectStatus));
  const finished = projects.filter((p) => !IN_PROGRESS.includes(p.status as ProjectStatus));
  // Sin relación proyecto→diseñador en el schema todavía: se contacta al primer partner.
  const mainDesigner = designers[0];

  // Zona de identidad: con perfil propio se envuelve en ContextMenu (click o
  // click derecho) para cambiar imagen y editar información.
  const identity = (
    <Row gap="20" vertical="center">
      {isOwnProfile ? (
        // stopPropagation: el click del overlay no debe abrir además el ContextMenu
        <button
          type="button"
          className={styles.avatarButton}
          aria-label="Cambiar imagen de perfil"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDialog("avatar");
          }}
        >
          <Avatar {...avatarProps} size="l" />
          <span className={styles.avatarEdit}>
            <Icon name="edit" size="s" />
          </span>
        </button>
      ) : (
        <Avatar {...avatarProps} size="l" />
      )}
      <Column gap="4" style={{ minWidth: 0 }}>
        <Heading variant="heading-strong-l">{displayName}</Heading>
        <Row gap="8" vertical="center" wrap style={{ minWidth: 0 }}>
          <Tag size="s" variant="brand" label="Cliente" />
          {isOwnProfile && email && (
            <Text
              variant="label-default-s"
              onBackground="neutral-weak"
              style={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {email}
            </Text>
          )}
        </Row>
        {(company || brand) && (
          <Text variant="label-default-s" onBackground="neutral-weak">
            {[company, brand].filter(Boolean).join(" · ")}
          </Text>
        )}
        {motto && (
          <Text variant="body-default-s" onBackground="neutral-weak" style={{ fontStyle: "italic" }}>
            “{motto}”
          </Text>
        )}
      </Column>
    </Row>
  );

  return (
    <RevealFx fillWidth horizontal="center" revealedByDefault>
      <Column fillWidth maxWidth="l" horizontal="center" paddingBottom="80">
        <Column fillWidth paddingX="32" paddingTop="40" gap="24">

          {/* ── Cabecera del panel ─────────────────────────────────────────── */}
          <Card fillWidth padding="24" radius="l">
            <Row fillWidth gap="20" vertical="center" horizontal="between" wrap>
              {isOwnProfile ? (
                <ContextMenu
                  placement="bottom-start"
                  onSelect={(value) => setOpenDialog(value as "avatar" | "info")}
                  style={{ cursor: "pointer" }}
                  dropdown={
                    <Column minWidth={14} padding="4" gap="2">
                      <Option
                        label="Cambiar imagen de perfil"
                        value="avatar"
                        hasPrefix={<Icon name="camera" size="s" onBackground="neutral-weak" />}
                      />
                      <Option
                        label="Editar información"
                        value="info"
                        hasPrefix={<Icon name="edit" size="s" onBackground="neutral-weak" />}
                      />
                    </Column>
                  }
                >
                  {identity}
                </ContextMenu>
              ) : (
                identity
              )}

              <Row gap="8" vertical="center">
                <Tag size="m" variant="warning" label={`${inProgress.length} en curso`} />
                <Tag size="m" variant="success" label={`${finished.filter((p) => p.status === "completed").length} completados`} />
                {isOwnProfile && whatsapp && (
                  <IconButton
                    icon="whatsapp"
                    size="m"
                    variant="tertiary"
                    tooltip={`Tu WhatsApp: ${whatsapp}`}
                    tooltipPosition="bottom"
                  />
                )}
              </Row>
            </Row>
          </Card>

          {/* ── Accesos rápidos ────────────────────────────────────────────── */}
          <Grid columns={3} s={{ columns: 1 }} gap="16" fillWidth>
            {QUICK_ACCESS.map((item) => (
              <Card key={item.href} fillWidth padding="20" radius="l" href={item.href} direction="column" gap="12">
                <Row fillWidth horizontal="between" vertical="center">
                  <Icon name={item.icon} size="m" onBackground="brand-weak" />
                  <Icon name="arrowUpRight" size="s" onBackground="neutral-weak" />
                </Row>
                <Column gap="4">
                  <Text variant="heading-strong-s">{item.title}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {item.description}
                  </Text>
                </Column>
              </Card>
            ))}
          </Grid>

          {/* ── Tablero de proyectos + paneles laterales ───────────────────── */}
          <Row fillWidth gap="24" vertical="start" s={{ direction: "column" }}>

            {/* Tablero tipo Monday */}
            <Column gap="16" fillWidth>
              <Heading variant="heading-strong-m">Mis proyectos</Heading>

              {projects.length === 0 ? (
                <Column
                  fillWidth
                  horizontal="center"
                  gap="16"
                  padding="48"
                  border="neutral-alpha-medium"
                  radius="l"
                >
                  <Icon name="sparkles" size="l" onBackground="neutral-weak" />
                  <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                    Aún no has contratado proyectos.
                  </Text>
                  <Button href="/servicios/cotizador" variant="primary" size="m" prefixIcon="plus">
                    Cotizar mi primer proyecto
                  </Button>
                </Column>
              ) : (
                <Column gap="16" fillWidth>
                  <ProjectGroup title="En curso" variant="warning" projects={inProgress} designer={mainDesigner} />
                  <ProjectGroup title="Finalizados" variant="success" projects={finished} designer={mainDesigner} />
                </Column>
              )}
            </Column>

            {/* Paneles laterales */}
            <Column gap="16" fillWidth style={{ maxWidth: 320 }}>

              {/* Diseñadores contratados */}
              <Column background="neutral-alpha-weak" border="neutral-alpha-weak" padding="16" radius="m" gap="12">
                <Row gap="8" vertical="center">
                  <Icon name="userGroup" size="s" onBackground="neutral-weak" />
                  <Text variant="label-strong-s">Tus diseñadores</Text>
                </Row>
                {designers.length === 0 ? (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Todavía no trabajas con ningún diseñador.
                  </Text>
                ) : (
                  designers.map((designer) => (
                    <Row key={designer.username ?? designer.name} fillWidth horizontal="between" vertical="center" gap="8">
                      <Row gap="12" vertical="center">
                        <Avatar
                          size="s"
                          {...(designer.imageUrl
                            ? { src: designer.imageUrl }
                            : { value: (designer.name?.[0] ?? "P").toUpperCase() })}
                        />
                        <Column gap="2">
                          <Text variant="label-default-s" onBackground="neutral-strong">
                            {designer.name ?? designer.username}
                          </Text>
                          <Text variant="label-default-s" onBackground="neutral-weak">
                            Partner
                          </Text>
                        </Column>
                      </Row>
                      <Row gap="4" vertical="center">
                        {designer.whatsapp && (
                          <IconButton
                            icon="whatsapp"
                            size="s"
                            variant="tertiary"
                            href={waLink(designer.whatsapp)}
                            tooltip="Contactar por WhatsApp"
                            tooltipPosition="top"
                          />
                        )}
                        {designer.username && (
                          <IconButton
                            icon="person"
                            size="s"
                            variant="tertiary"
                            href={`/${designer.username}`}
                            tooltip="Ver perfil"
                            tooltipPosition="top"
                          />
                        )}
                      </Row>
                    </Row>
                  ))
                )}
                <Line background="neutral-alpha-weak" />
                <Button href="/explorar" variant="secondary" size="s" fillWidth prefixIcon="search">
                  Buscar más talento
                </Button>
              </Column>

              {/* Recursos por categoría */}
              <Column background="neutral-alpha-weak" border="neutral-alpha-weak" padding="16" radius="m" gap="12">
                <Row gap="8" vertical="center">
                  <Icon name="download" size="s" onBackground="neutral-weak" />
                  <Text variant="label-strong-s">Recursos compartidos</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Materiales que tus diseñadores publican para ti.
                </Text>
                <Row gap="8" wrap>
                  {Object.entries(RESOURCE_CATEGORY_SLUGS).map(([slug, label]) => (
                    <Button key={slug} href={`/recursos/${slug}`} variant="secondary" size="s">
                      {label}
                    </Button>
                  ))}
                </Row>
              </Column>

            </Column>
          </Row>
        </Column>

        {isOwnProfile && (
          <>
            <AvatarUploadDialog
              isOpen={openDialog === "avatar"}
              onClose={() => setOpenDialog(null)}
              currentImageUrl={avatarUrl}
            />
            <EditInfoDialog
              isOpen={openDialog === "info"}
              onClose={() => setOpenDialog(null)}
              initial={{
                whatsapp: whatsapp ?? "",
                secondaryEmail: secondaryEmail ?? "",
                address: address ?? "",
                company: company ?? "",
                brand: brand ?? "",
                motto: motto ?? "",
              }}
            />
          </>
        )}
      </Column>
    </RevealFx>
  );
}
