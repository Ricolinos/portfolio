import { prisma } from "@/lib/prisma";
import type { ConnectionStatus } from "@/generated/prisma/client";

/* ══ Tipos compartidos (fechas serializadas como ISO string para Server → ══
   ══ Client Components) ═══════════════════════════════════════════════ */

export interface CollabPartnerSummary {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
  // Solo presente si el partner activó User.shareWhatsapp (opt-in); ver
  // src/app/[username]/page.tsx para la misma regla en el perfil público.
  whatsapp: string | null;
}

export interface CollabClientSummary {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
}

// Colaborador adicional del proyecto (además del partner "fundador" de la
// Connection). headline = puesto/profesión (User.headline).
export interface CollabCollaboratorSummary {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
  headline: string | null;
}

export interface CollabTask {
  id: string;
  title: string;
  status: string;
  order: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollabLink {
  id: string;
  label: string;
  url: string;
  provider: string;
  // brand = assets de marca (subidos por el cliente) | final = activos
  // finales (subidos por cualquier partner/colaborador)
  type: string;
  addedById: string;
  projectId: string;
  createdAt: string;
}

export interface CollabProjectData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  clientNotes: string | null;
  // Cotización y calendario del borrador; editables por ambas partes
  quoteAmount: number | null;
  quoteCurrency: string;
  quoteNotes: string | null;
  startDate: string | null;
  dueDate: string | null;
  connectionId: string;
  createdAt: string;
  updatedAt: string;
  tasks: CollabTask[];
  links: CollabLink[];
  collaborators: CollabCollaboratorSummary[];
}

export interface ClientConnectionData {
  id: string;
  status: ConnectionStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  partner: CollabPartnerSummary;
}

export interface PartnerConnectionData {
  id: string;
  status: ConnectionStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  client: CollabClientSummary;
}

export interface ClientResourceData {
  id: string;
  label: string;
  url: string;
  provider: string;
  description: string | null;
  sharedWith: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SharedResourceData extends ClientResourceData {
  owner: CollabClientSummary;
}

export interface ClientCollabData {
  connections: ClientConnectionData[];
  projects: CollabProjectData[];
  resources: ClientResourceData[];
}

export interface PartnerCollabData {
  pendingRequests: PartnerConnectionData[];
  connections: PartnerConnectionData[];
  projects: CollabProjectData[];
  sharedResources: SharedResourceData[];
}

/* ══ Helpers de proyección/serialización ══════════════════════════════ */

function toPartnerSummary(partner: {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
  whatsapp: string | null;
  shareWhatsapp: boolean;
}): CollabPartnerSummary {
  return {
    id: partner.id,
    username: partner.username,
    name: partner.name,
    imageUrl: partner.imageUrl,
    whatsapp: partner.shareWhatsapp ? partner.whatsapp : null,
  };
}

function toClientSummary(client: {
  id: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
}): CollabClientSummary {
  return {
    id: client.id,
    username: client.username,
    name: client.name,
    imageUrl: client.imageUrl,
  };
}

function toTask(task: {
  id: string;
  title: string;
  status: string;
  order: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}): CollabTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    order: task.order,
    projectId: task.projectId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function toLink(link: {
  id: string;
  label: string;
  url: string;
  provider: string;
  type: string;
  addedById: string;
  projectId: string;
  createdAt: Date;
}): CollabLink {
  return {
    id: link.id,
    label: link.label,
    url: link.url,
    provider: link.provider,
    type: link.type,
    addedById: link.addedById,
    projectId: link.projectId,
    createdAt: link.createdAt.toISOString(),
  };
}

function toCollaborator(collaborator: {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    imageUrl: string | null;
    headline: string | null;
  };
}): CollabCollaboratorSummary {
  return {
    id: collaborator.user.id,
    username: collaborator.user.username,
    name: collaborator.user.name,
    imageUrl: collaborator.user.imageUrl,
    headline: collaborator.user.headline,
  };
}

function toProject(project: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  clientNotes: string | null;
  quoteAmount: { toString(): string } | null;
  quoteCurrency: string;
  quoteNotes: string | null;
  startDate: Date | null;
  dueDate: Date | null;
  connectionId: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: Parameters<typeof toTask>[0][];
  links: Parameters<typeof toLink>[0][];
  collaborators: Parameters<typeof toCollaborator>[0][];
}): CollabProjectData {
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    clientNotes: project.clientNotes,
    quoteAmount: project.quoteAmount === null ? null : Number(project.quoteAmount),
    quoteCurrency: project.quoteCurrency,
    quoteNotes: project.quoteNotes,
    startDate: project.startDate === null ? null : project.startDate.toISOString(),
    dueDate: project.dueDate === null ? null : project.dueDate.toISOString(),
    connectionId: project.connectionId,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    tasks: project.tasks.map(toTask),
    links: project.links.map(toLink),
    collaborators: project.collaborators.map(toCollaborator),
  };
}

function toResource(resource: {
  id: string;
  label: string;
  url: string;
  provider: string;
  description: string | null;
  sharedWith: string[];
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}): ClientResourceData {
  return {
    id: resource.id,
    label: resource.label,
    url: resource.url,
    provider: resource.provider,
    description: resource.description,
    sharedWith: resource.sharedWith,
    ownerId: resource.ownerId,
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  };
}

const PROJECT_INCLUDE = {
  tasks: { orderBy: { order: "asc" as const } },
  links: { orderBy: { createdAt: "asc" as const } },
  collaborators: {
    include: {
      user: { select: { id: true, username: true, name: true, imageUrl: true, headline: true } },
    },
  },
};

const PARTNER_SELECT = {
  id: true,
  username: true,
  name: true,
  imageUrl: true,
  whatsapp: true,
  shareWhatsapp: true,
};

const CLIENT_SELECT = {
  id: true,
  username: true,
  name: true,
  imageUrl: true,
};

/* ══ Queries ═══════════════════════════════════════════════════════════ */

// Todo lo que un cliente ve en su panel de colaboración: sus solicitudes de
// contacto (con datos públicos del partner), sus proyectos conjuntos con
// tareas/links, y sus propios recursos ("Mis recursos").
export async function getClientCollabData(userId: string): Promise<ClientCollabData> {
  const connections = await prisma.connection.findMany({
    where: { clientId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      partner: { select: PARTNER_SELECT },
      projects: { include: PROJECT_INCLUDE, orderBy: { createdAt: "desc" } },
    },
  });

  const resources = await prisma.clientResource.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  return {
    connections: connections.map((connection) => ({
      id: connection.id,
      status: connection.status,
      message: connection.message,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      partner: toPartnerSummary(connection.partner),
    })),
    projects: connections.flatMap((connection) => connection.projects.map(toProject)),
    resources: resources.map(toResource),
  };
}

// Todo lo que un partner ve en su panel de colaboración: solicitudes
// pendientes por responder, connections ya aceptadas, proyectos conjuntos
// con tareas/links, y recursos de clientes que le compartieron acceso.
export async function getPartnerCollabData(userId: string): Promise<PartnerCollabData> {
  const [pending, accepted, sharedResources, collaboratorProjects] = await Promise.all([
    prisma.connection.findMany({
      where: { partnerId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { client: { select: CLIENT_SELECT } },
    }),
    prisma.connection.findMany({
      where: { partnerId: userId, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: CLIENT_SELECT },
        projects: { include: PROJECT_INCLUDE, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.clientResource.findMany({
      where: { sharedWith: { has: userId } },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: CLIENT_SELECT } },
    }),
    // Proyectos donde el usuario participa como ProjectCollaborator, aunque
    // no sea el partner "fundador" de ninguna Connection con ese cliente
    // (multi-colaborador: varios partners en un mismo CollabProject).
    prisma.collabProject.findMany({
      where: { collaborators: { some: { userId } } },
      include: PROJECT_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const foundingProjects = accepted.flatMap((connection) => connection.projects.map(toProject));
  const dedupedCollaboratorProjects = collaboratorProjects
    .map(toProject)
    .filter((project) => !foundingProjects.some((existing) => existing.id === project.id));

  return {
    pendingRequests: pending.map((connection) => ({
      id: connection.id,
      status: connection.status,
      message: connection.message,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      client: toClientSummary(connection.client),
    })),
    connections: accepted.map((connection) => ({
      id: connection.id,
      status: connection.status,
      message: connection.message,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString(),
      client: toClientSummary(connection.client),
    })),
    projects: [...foundingProjects, ...dedupedCollaboratorProjects],
    sharedResources: sharedResources.map((resource) => ({
      ...toResource(resource),
      owner: toClientSummary(resource.owner),
    })),
  };
}

// Proyecto individual con tareas ordenadas y links; solo si userId es parte
// del proyecto: cliente, partner "fundador" de la Connection, o colaborador
// adicional (ProjectCollaborator). null si no existe o el usuario no está
// autorizado a verlo.
export async function getCollabProject(
  projectId: string,
  userId: string,
): Promise<CollabProjectData | null> {
  const project = await prisma.collabProject.findUnique({
    where: { id: projectId },
    include: {
      ...PROJECT_INCLUDE,
      connection: { select: { clientId: true, partnerId: true } },
    },
  });

  if (!project) return null;

  const isClient = project.connection.clientId === userId;
  const isPartner = project.connection.partnerId === userId;
  const isCollaborator = project.collaborators.some((collaborator) => collaborator.userId === userId);
  if (!isClient && !isPartner && !isCollaborator) {
    return null;
  }

  return toProject(project);
}
