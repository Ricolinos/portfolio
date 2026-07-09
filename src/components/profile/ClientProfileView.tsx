"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type {
  ClientConnectionData,
  ClientResourceData,
  CollabPartnerSummary,
  CollabProjectData,
} from "@/lib/collab";
import { AvatarUploadDialog, EditInfoDialog, SecurityPrivacyDialog } from "./ClientProfileEditDialogs";
import {
  AddClientResourceDialog,
  DeleteClientResourceDialog,
  NewCollabProjectDialog,
  ShareClientResourceDialog,
  type ConnectionOption,
  type ShareablePartner,
} from "./ClientCollabDialogs";
import styles from "./ClientProfileView.module.scss";

export interface ClientProject {
  id: string;
  title: string;
  status: string;
  currency: string;
  total: number | null;
  updatedAt: string; // ISO string
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
  connections?: ClientConnectionData[];
  collabProjects?: CollabProjectData[];
  resources?: ClientResourceData[];
}

const COLLAB_PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

const COLLAB_PROJECT_STATUS_VARIANTS: Record<string, "neutral" | "warning" | "success"> = {
  active: "warning",
  completed: "success",
  archived: "neutral",
};

const PROVIDER_LABELS: Record<string, string> = {
  drive: "Drive",
  dropbox: "Dropbox",
  onedrive: "OneDrive",
  wetransfer: "WeTransfer",
  other: "Link",
};

// Colores tipo tablero Monday: en progreso ámbar, completado verde, enviada azul.
const STATUS_VARIANTS: Record<ProjectStatus, "neutral" | "info" | "warning" | "success"> = {
  draft: "neutral",
  sent: "info",
  active: "warning",
  completed: "success",
  archived: "neutral",
};

const IN_PROGRESS: ProjectStatus[] = ["draft", "sent", "active"];

// href null = acceso aún sin destino (pendiente definir la página de nuevo
// proyecto); se pinta como panel estático, no como tarjeta clicable.
const QUICK_ACCESS = [
  {
    icon: "search",
    title: "Buscar talento",
    description: "Encuentra diseñadores para tu próximo proyecto.",
    href: "/explorar/designerds",
  },
  {
    icon: "plus",
    title: "Nuevo proyecto",
    description: "Muy pronto podrás iniciar proyectos desde aquí.",
    href: null,
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

function ProjectRow({ project, designer }: { project: ClientProject; designer?: CollabPartnerSummary }) {
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
  designer?: CollabPartnerSummary;
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

// Fila de un proyecto en colaboración (con partner ya aceptado): estatus,
// tareas esperando aprobación del cliente, y click para ir al detalle.
function CollabProjectRow({ project }: { project: CollabProjectData }) {
  const router = useRouter();
  const pendingReview = project.tasks.filter((task) => task.status === "in_review").length;
  const status = project.status;

  return (
    <Row
      fillWidth
      paddingX="20"
      paddingY="12"
      horizontal="between"
      vertical="center"
      gap="16"
      style={{ cursor: "pointer" }}
      onClick={() => router.push(`/proyectos/${project.id}`)}
    >
      <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
        <Icon name="folder" size="s" onBackground="neutral-weak" />
        <Text
          variant="label-default-m"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {project.title}
        </Text>
      </Row>

      <Row gap="8" vertical="center">
        {pendingReview > 0 && (
          <Tag
            size="s"
            variant="warning"
            label={`${pendingReview} por aprobar`}
          />
        )}
        <Tag
          size="s"
          variant={COLLAB_PROJECT_STATUS_VARIANTS[status] ?? "neutral"}
          label={COLLAB_PROJECT_STATUS_LABELS[status] ?? status}
        />
      </Row>
    </Row>
  );
}

function CollabProjectGroup({ projects }: { projects: CollabProjectData[] }) {
  if (projects.length === 0) return null;

  return (
    <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
      <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" background="neutral-alpha-weak">
        <Row gap="8" vertical="center">
          <Tag size="s" variant="brand" label="Proyectos en colaboración" />
        </Row>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
        </Text>
      </Row>
      {projects.map((project) => (
        <Column key={project.id} fillWidth>
          <Line background="neutral-alpha-weak" />
          <CollabProjectRow project={project} />
        </Column>
      ))}
    </Column>
  );
}

// Fila de un recurso propio del cliente ("Mis recursos"): abrir, compartir y
// eliminar. sharedWith se resume como cantidad de partners con acceso.
function ResourceRow({
  resource,
  onShare,
  onDelete,
}: {
  resource: ClientResourceData;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <Row fillWidth paddingX="20" paddingY="12" horizontal="between" vertical="center" gap="16" wrap>
      <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
        <Icon name="link" size="s" onBackground="neutral-weak" />
        <Text
          variant="label-default-m"
          onBackground="neutral-strong"
          style={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {resource.label}
        </Text>
      </Row>

      <Row gap="8" vertical="center">
        <Tag size="s" variant="neutral" label={PROVIDER_LABELS[resource.provider] ?? "Link"} />
        {resource.sharedWith.length > 0 && (
          <Tag
            size="s"
            variant="info"
            label={`Compartido con ${resource.sharedWith.length}`}
          />
        )}
        <IconButton
          icon="arrowUpRightFromSquare"
          size="s"
          variant="tertiary"
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          tooltip="Abrir en nueva pestaña"
          tooltipPosition="top"
        />
        <IconButton
          icon="userGroup"
          size="s"
          variant="tertiary"
          tooltip="Compartir con partners"
          tooltipPosition="top"
          onClick={onShare}
        />
        <IconButton
          icon="trash"
          size="s"
          variant="tertiary"
          tooltip="Eliminar recurso"
          tooltipPosition="top"
          onClick={onDelete}
        />
      </Row>
    </Row>
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
  connections = [],
  collabProjects = [],
  resources = [],
}: ClientProfileViewProps) {
  const [openDialog, setOpenDialog] = useState<"avatar" | "info" | "security" | null>(null);
  const [collabDialogOpen, setCollabDialogOpen] = useState(false);
  const [resourceDialog, setResourceDialog] = useState<"add" | null>(null);
  const [shareCandidate, setShareCandidate] = useState<ClientResourceData | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ClientResourceData | null>(null);

  const initials = (displayName[0] ?? "U").toUpperCase();
  const avatarProps = avatarUrl ? { src: avatarUrl } : { value: initials };

  const inProgress = projects.filter((p) => IN_PROGRESS.includes(p.status as ProjectStatus));
  const finished = projects.filter((p) => !IN_PROGRESS.includes(p.status as ProjectStatus));
  const acceptedConnections = connections.filter((c) => c.status === "ACCEPTED");
  const pendingConnections = connections.filter((c) => c.status === "PENDING");
  // Sin relación proyecto→diseñador en el schema todavía: se contacta al primer partner aceptado.
  const mainDesigner = acceptedConnections[0]?.partner;

  const collabProjectOptions: ConnectionOption[] = acceptedConnections.map((connection) => ({
    value: connection.id,
    label: connection.partner.name ?? connection.partner.username ?? "Partner",
  }));

  const shareablePartners: ShareablePartner[] = acceptedConnections.map((connection) => ({
    id: connection.partner.id,
    name: connection.partner.name,
    username: connection.partner.username,
    imageUrl: connection.partner.imageUrl,
  }));

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
          {(() => {
            const headerContent = (
              <Row fillWidth gap="20" vertical="center" horizontal="between" wrap>
                {identity}
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
            );
            return (
              <Card fillWidth padding="24" radius="l">
                {isOwnProfile ? (
                  // El menú cubre toda la cabecera, no solo la zona de identidad
                  <ContextMenu
                    fillWidth
                    placement="bottom-start"
                    onSelect={(value) => setOpenDialog(value as "avatar" | "info" | "security")}
                    style={{ cursor: "pointer" }}
                    dropdown={
                      <Column minWidth={14} padding="4" gap="2">
                        <Option
                          label="Cambiar imagen de perfil"
                          value="avatar"
                          hasPrefix={<Icon name="camera" size="s" onBackground="neutral-weak" />}
                        />
                        <Option
                          label="Editar perfil"
                          value="info"
                          hasPrefix={<Icon name="edit" size="s" onBackground="neutral-weak" />}
                        />
                        <Option
                          label="Seguridad y privacidad"
                          value="security"
                          hasPrefix={<Icon name="shield" size="s" onBackground="neutral-weak" />}
                        />
                      </Column>
                    }
                  >
                    {headerContent}
                  </ContextMenu>
                ) : (
                  headerContent
                )}
              </Card>
            );
          })()}

          {/* ── Accesos rápidos ────────────────────────────────────────────── */}
          <Grid columns={2} s={{ columns: 1 }} gap="16" fillWidth>
            {QUICK_ACCESS.map((item) => {
              const inner = (
                <>
                  <Row fillWidth horizontal="between" vertical="center">
                    <Icon name={item.icon} size="m" onBackground="brand-weak" />
                    {item.href && <Icon name="arrowUpRight" size="s" onBackground="neutral-weak" />}
                  </Row>
                  <Column gap="4">
                    <Text variant="heading-strong-s">{item.title}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {item.description}
                    </Text>
                  </Column>
                </>
              );
              return item.href ? (
                <Card key={item.title} fillWidth padding="20" radius="l" href={item.href} direction="column" gap="12">
                  {inner}
                </Card>
              ) : (
                <Column key={item.title} fillWidth padding="20" radius="l" background="surface" border="neutral-alpha-weak" gap="12">
                  {inner}
                </Column>
              );
            })}
          </Grid>

          {/* ── Tablero de proyectos + paneles laterales ───────────────────── */}
          <Row fillWidth gap="24" vertical="start" s={{ direction: "column" }}>

            {/* Tablero tipo Monday */}
            <Column gap="40" fillWidth>
              <Column gap="16" fillWidth>
                <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
                  <Heading variant="heading-strong-m">Mis proyectos</Heading>
                  {acceptedConnections.length > 0 && (
                    <Button
                      variant="secondary"
                      size="s"
                      prefixIcon="plus"
                      onClick={() => setCollabDialogOpen(true)}
                    >
                      Nuevo proyecto
                    </Button>
                  )}
                </Row>

                <CollabProjectGroup projects={collabProjects} />

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

              {/* Mis recursos: assets propios del cliente como links compartibles */}
              <Column gap="16" fillWidth>
                <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
                  <Heading variant="heading-strong-m">Mis recursos</Heading>
                  <Button
                    variant="secondary"
                    size="s"
                    prefixIcon="plus"
                    onClick={() => setResourceDialog("add")}
                  >
                    Agregar recurso
                  </Button>
                </Row>

                {resources.length === 0 ? (
                  <Column
                    fillWidth
                    horizontal="center"
                    gap="12"
                    padding="32"
                    border="neutral-alpha-medium"
                    radius="l"
                  >
                    <Icon name="folder" size="l" onBackground="neutral-weak" />
                    <Text variant="body-default-m" onBackground="neutral-weak" align="center">
                      Aún no agregas recursos. Sube tus assets a tu nube favorita y comparte el link aquí.
                    </Text>
                  </Column>
                ) : (
                  <Column fillWidth border="neutral-alpha-medium" radius="l" overflow="hidden">
                    {resources.map((resource, index) => (
                      <Column key={resource.id} fillWidth>
                        {index > 0 && <Line background="neutral-alpha-weak" />}
                        <ResourceRow
                          resource={resource}
                          onShare={() => setShareCandidate(resource)}
                          onDelete={() => setDeleteCandidate(resource)}
                        />
                      </Column>
                    ))}
                  </Column>
                )}
              </Column>
            </Column>

            {/* Paneles laterales */}
            <Column gap="16" fillWidth style={{ maxWidth: 320 }}>

              {/* Diseñadores contratados */}
              <Column background="neutral-alpha-weak" border="neutral-alpha-weak" padding="16" radius="m" gap="12">
                <Row gap="8" vertical="center">
                  <Icon name="userGroup" size="s" onBackground="neutral-weak" />
                  <Text variant="label-strong-s">Tus diseñadores</Text>
                </Row>
                {connections.length === 0 ? (
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Todavía no trabajas con ningún diseñador.
                  </Text>
                ) : (
                  <>
                    {acceptedConnections.map(({ partner }) => (
                      <Row key={partner.id} fillWidth horizontal="between" vertical="center" gap="8">
                        <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
                          <Avatar
                            size="s"
                            {...(partner.imageUrl
                              ? { src: partner.imageUrl }
                              : { value: (partner.name?.[0] ?? "P").toUpperCase() })}
                          />
                          <Column gap="2" style={{ minWidth: 0 }}>
                            <Text
                              variant="label-default-s"
                              onBackground="neutral-strong"
                              style={{ minWidth: 0, overflowWrap: "anywhere" }}
                            >
                              {partner.name ?? partner.username}
                            </Text>
                            <Text variant="label-default-s" onBackground="neutral-weak">
                              Partner
                            </Text>
                          </Column>
                        </Row>
                        <Row gap="4" vertical="center">
                          {partner.whatsapp && (
                            <IconButton
                              icon="whatsapp"
                              size="s"
                              variant="tertiary"
                              href={waLink(partner.whatsapp)}
                              tooltip="Contactar por WhatsApp"
                              tooltipPosition="top"
                            />
                          )}
                          {partner.username && (
                            <IconButton
                              icon="person"
                              size="s"
                              variant="tertiary"
                              href={`/${partner.username}`}
                              tooltip="Ver perfil"
                              tooltipPosition="top"
                            />
                          )}
                        </Row>
                      </Row>
                    ))}
                    {pendingConnections.map(({ id, partner }) => (
                      <Row key={id} fillWidth horizontal="between" vertical="center" gap="8">
                        <Row gap="12" vertical="center" style={{ minWidth: 0 }}>
                          <Avatar
                            size="s"
                            {...(partner.imageUrl
                              ? { src: partner.imageUrl }
                              : { value: (partner.name?.[0] ?? "P").toUpperCase() })}
                          />
                          <Column gap="2" style={{ minWidth: 0 }}>
                            <Text
                              variant="label-default-s"
                              onBackground="neutral-strong"
                              style={{ minWidth: 0, overflowWrap: "anywhere" }}
                            >
                              {partner.name ?? partner.username}
                            </Text>
                          </Column>
                        </Row>
                        <Tag size="s" variant="neutral" label="Solicitud enviada" />
                      </Row>
                    ))}
                  </>
                )}
                <Line background="neutral-alpha-weak" />
                <Button href="/explorar/designerds" variant="secondary" size="s" fillWidth prefixIcon="search">
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
            <SecurityPrivacyDialog
              isOpen={openDialog === "security"}
              onClose={() => setOpenDialog(null)}
            />
            <NewCollabProjectDialog
              isOpen={collabDialogOpen}
              onClose={() => setCollabDialogOpen(false)}
              options={collabProjectOptions}
            />
            <AddClientResourceDialog
              isOpen={resourceDialog === "add"}
              onClose={() => setResourceDialog(null)}
            />
            <ShareClientResourceDialog
              key={shareCandidate?.id ?? "none"}
              isOpen={shareCandidate !== null}
              onClose={() => setShareCandidate(null)}
              resource={shareCandidate}
              partners={shareablePartners}
            />
            <DeleteClientResourceDialog
              isOpen={deleteCandidate !== null}
              onClose={() => setDeleteCandidate(null)}
              resource={deleteCandidate}
            />
          </>
        )}
      </Column>
    </RevealFx>
  );
}
