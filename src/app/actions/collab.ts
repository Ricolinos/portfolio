"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { detectProvider, validateExternalUrl } from "@/lib/externalLink";
import { sendCollabNotification } from "@/lib/collabNotify";
import type { ConnectionStatus } from "@/generated/prisma/client";

/* ══ Colaboración cliente ↔ partner: solicitudes de contacto, proyectos ══
   ══ conjuntos con tareas/links externos, y recursos compartibles del ══
   ══ cliente. La plataforma nunca guarda archivos: todo es un link a la ══
   ══ nube (Drive/Dropbox/etc.), validado con src/lib/externalLink.ts. ══ */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const TASK_STATUSES = ["pending", "in_review", "approved"] as const;
type TaskStatus = (typeof TASK_STATUSES)[number];

const COLLAB_PROJECT_STATUSES = ["active", "completed", "archived"] as const;
type CollabProjectStatus = (typeof COLLAB_PROJECT_STATUSES)[number];

async function requireAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

function revalidateUsernames(...usernames: (string | null | undefined)[]): void {
  for (const username of usernames) {
    if (username) revalidatePath(`/${username}`);
  }
}

/* ══ Autorización multi-colaborador ═══════════════════════════════════
   Con ProjectCollaborator, "el partner" de un proyecto ya no es solo el
   partnerId de la Connection: es ese partnerId MÁS cualquier fila en
   ProjectCollaborator para ese proyecto. Este helper centraliza esa unión
   para no repetir la query en cada server action (también usado por
   src/app/actions/projectAssets.ts). ══════════════════════════════════ */
export interface ProjectAuthResult {
  ok: boolean;
  error?: string;
  isClient?: boolean;
  isPartner?: boolean;
  clientId?: string;
  clientUsername?: string | null;
  partnerUsername?: string | null;
  partnerIds?: Set<string>;
}

export async function getProjectAuth(projectId: string, userId: string): Promise<ProjectAuthResult> {
  const project = await prisma.collabProject.findUnique({
    where: { id: projectId },
    select: {
      connection: {
        select: {
          clientId: true,
          partnerId: true,
          client: { select: { username: true } },
          partner: { select: { username: true } },
        },
      },
      collaborators: { select: { userId: true } },
    },
  });
  if (!project) return { ok: false, error: "Proyecto no encontrado." };

  const isClient = project.connection.clientId === userId;
  const partnerIds = new Set([
    project.connection.partnerId,
    ...project.collaborators.map((collaborator) => collaborator.userId),
  ]);
  const isPartner = partnerIds.has(userId);

  if (!isClient && !isPartner) return { ok: false, error: "No autorizado" };

  return {
    ok: true,
    isClient,
    isPartner,
    clientId: project.connection.clientId,
    clientUsername: project.connection.client.username,
    partnerUsername: project.connection.partner.username,
    partnerIds,
  };
}

/* ══ Solicitudes de contacto ══════════════════════════════════════════ */

// Solo un cliente puede iniciar contacto; el destino debe ser un partner
// (role "collaborator"). Reintentar tras un rechazo vuelve la solicitud a
// PENDING; si ya está PENDING/ACCEPTED se informa en vez de duplicar.
export async function sendContactRequest(
  partnerId: string,
  message?: string,
): Promise<Result<{ connectionId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };
  if (userId === partnerId) return { ok: false, error: "No puedes contactarte a ti mismo." };

  const [client, partner] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, username: true, name: true } }),
    prisma.user.findUnique({
      where: { id: partnerId },
      select: { role: true, username: true, name: true, email: true },
    }),
  ]);
  if (!client || client.role !== "client") {
    return { ok: false, error: "Solo un cliente puede enviar solicitudes de contacto." };
  }
  if (!partner || partner.role !== "collaborator") {
    return { ok: false, error: "El destinatario no es un partner válido." };
  }

  const trimmedMessage = message?.trim() || null;

  const existing = await prisma.connection.findUnique({
    where: { clientId_partnerId: { clientId: userId, partnerId } },
  });

  let connectionId: string;
  if (!existing) {
    const created = await prisma.connection.create({
      data: { clientId: userId, partnerId, message: trimmedMessage, status: "PENDING" },
      select: { id: true },
    });
    connectionId = created.id;
  } else if (existing.status === "REJECTED") {
    const updated = await prisma.connection.update({
      where: { id: existing.id },
      data: { status: "PENDING", message: trimmedMessage },
      select: { id: true },
    });
    connectionId = updated.id;
  } else {
    return {
      ok: false,
      error:
        existing.status === "PENDING"
          ? "Ya existe una solicitud pendiente con este partner."
          : "Ya tienes una conexión activa con este partner.",
    };
  }

  void sendCollabNotification({
    to: partner.email,
    recipientName: partner.name,
    subject: `Nueva solicitud de contacto de ${client.name ?? "un cliente"}`,
    heading: "Tienes una nueva solicitud de contacto",
    body: `${client.name ?? "Un cliente"} quiere colaborar contigo en la plataforma.${
      trimmedMessage ? ` Mensaje: "${trimmedMessage}"` : ""
    }`,
    ctaUrl: partner.username ? `/${partner.username}` : undefined,
    ctaLabel: "Ver solicitud",
  });

  revalidateUsernames(client.username, partner.username);
  return { ok: true, connectionId };
}

// Solo el partner destinatario puede responder una solicitud PENDING.
export async function respondContactRequest(
  connectionId: string,
  accept: boolean,
): Promise<Result<{ status: ConnectionStatus }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: {
      partnerId: true,
      status: true,
      client: { select: { username: true, name: true, email: true } },
      partner: { select: { username: true, name: true } },
    },
  });
  if (!connection || connection.partnerId !== userId) {
    return { ok: false, error: "No autorizado" };
  }
  if (connection.status !== "PENDING") {
    return { ok: false, error: "Esta solicitud ya fue respondida." };
  }

  const status: ConnectionStatus = accept ? "ACCEPTED" : "REJECTED";
  await prisma.connection.update({ where: { id: connectionId }, data: { status } });

  if (accept) {
    void sendCollabNotification({
      to: connection.client.email,
      recipientName: connection.client.name,
      subject: `${connection.partner.name ?? "Un partner"} aceptó tu solicitud de contacto`,
      heading: "Tu solicitud de contacto fue aceptada",
      body: `${connection.partner.name ?? "El partner"} aceptó tu solicitud. Ya pueden colaborar en un proyecto conjunto.`,
      ctaUrl: connection.partner.username ? `/${connection.partner.username}` : undefined,
      ctaLabel: "Ver perfil",
    });
  }

  revalidateUsernames(connection.client.username, connection.partner.username);
  return { ok: true, status };
}

/* ══ Proyectos conjuntos ══════════════════════════════════════════════ */

// Cualquiera de las dos partes puede crear el proyecto, solo si la
// Connection ya está ACCEPTED.
export async function createCollabProject(
  connectionId: string,
  title: string,
  description?: string,
): Promise<Result<{ projectId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { ok: false, error: "El título es obligatorio." };

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: {
      clientId: true,
      partnerId: true,
      status: true,
      client: { select: { username: true, name: true, email: true } },
      partner: { select: { username: true, name: true, email: true } },
    },
  });
  if (!connection || (connection.clientId !== userId && connection.partnerId !== userId)) {
    return { ok: false, error: "No autorizado" };
  }
  if (connection.status !== "ACCEPTED") {
    return { ok: false, error: "La conexión debe estar aceptada para crear proyectos." };
  }

  const project = await prisma.collabProject.create({
    data: { connectionId, title: trimmedTitle, description: description?.trim() || null },
    select: { id: true },
  });

  // Notifica a la otra parte (no a quien creó el proyecto).
  const isClient = connection.clientId === userId;
  const creatorName = (isClient ? connection.client.name : connection.partner.name) ?? "Tu colaborador";
  const recipient = isClient ? connection.partner : connection.client;
  const recipientProfileUsername = isClient ? connection.client.username : connection.partner.username;
  void sendCollabNotification({
    to: recipient.email,
    recipientName: recipient.name,
    subject: `${creatorName} creó un proyecto conjunto: ${trimmedTitle}`,
    heading: "Nuevo proyecto conjunto",
    body: `${creatorName} creó el borrador "${trimmedTitle}" para trabajar juntos.`,
    ctaUrl: recipientProfileUsername ? `/${recipientProfileUsername}` : undefined,
    ctaLabel: "Ver proyecto",
  });

  revalidateUsernames(connection.client.username, connection.partner.username);
  return { ok: true, projectId: project.id };
}

/* ══ Colaboradores adicionales del proyecto ═══════════════════════════ */

// Agrega un partner adicional (además del partner "fundador" de la
// Connection) a un proyecto ya existente. Requiere que ese partner tenga su
// propia Connection ACCEPTED con el cliente del proyecto.
export async function addProjectCollaborator(
  projectId: string,
  partnerUserId: string,
): Promise<Result<{ collaboratorId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const auth = await getProjectAuth(projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Proyecto no encontrado." };
  const { isClient, isPartner } = auth;
  if (!isClient && !isPartner) return { ok: false, error: "No autorizado" };

  const collaboratorConnection = await prisma.connection.findUnique({
    where: {
      clientId_partnerId: { clientId: auth.clientId!, partnerId: partnerUserId },
    },
    select: { id: true, status: true },
  });
  if (!collaboratorConnection || collaboratorConnection.status !== "ACCEPTED") {
    return { ok: false, error: "Ese partner no tiene una conexión aceptada con el cliente." };
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId,
        userId: partnerUserId,
        connectionId: collaboratorConnection.id,
      },
      select: { id: true },
    });

    revalidateUsernames(auth.clientUsername, auth.partnerUsername);
    return { ok: true, collaboratorId: collaborator.id };
  } catch {
    return { ok: false, error: "Ese partner ya es colaborador de este proyecto." };
  }
}

// Solo el cliente del proyecto, o el propio colaborador (self-remove),
// pueden quitar a un colaborador adicional. El partner "fundador" de la
// Connection no es un ProjectCollaborator y no se puede quitar aquí.
export async function removeProjectCollaborator(
  projectId: string,
  collaboratorUserId: string,
): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const auth = await getProjectAuth(projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Proyecto no encontrado." };
  const { isClient } = auth;

  if (!isClient && userId !== collaboratorUserId) {
    return { ok: false, error: "No autorizado" };
  }

  await prisma.projectCollaborator.deleteMany({
    where: { projectId, userId: collaboratorUserId },
  });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true };
}

export interface UpdateCollabProjectInput {
  title?: string;
  description?: string;
  status?: string;
  clientNotes?: string;
  quoteAmount?: number;
  quoteCurrency?: string;
  quoteNotes?: string;
  startDate?: string | null;
  dueDate?: string | null;
}

// El cliente puede editar todos los campos; el partner solo title,
// description, status y los campos de cotización/calendario (clientNotes se
// ignora silenciosamente si no es el cliente quien edita).
export async function updateCollabProject(
  projectId: string,
  data: UpdateCollabProjectInput,
): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  if (data.status !== undefined && !COLLAB_PROJECT_STATUSES.includes(data.status as CollabProjectStatus)) {
    return { ok: false, error: "Estatus de proyecto inválido." };
  }

  const auth = await getProjectAuth(projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Proyecto no encontrado." };
  const { isClient, isPartner } = auth;
  if (!isClient && !isPartner) return { ok: false, error: "No autorizado" };

  await prisma.collabProject.update({
    where: { id: projectId },
    data: {
      title: data.title !== undefined ? data.title.trim() || undefined : undefined,
      description: data.description !== undefined ? data.description.trim() || null : undefined,
      status: data.status !== undefined ? data.status : undefined,
      clientNotes: isClient && data.clientNotes !== undefined ? data.clientNotes.trim() || null : undefined,
      quoteAmount: data.quoteAmount !== undefined ? data.quoteAmount : undefined,
      quoteCurrency: data.quoteCurrency !== undefined ? data.quoteCurrency.trim() || undefined : undefined,
      quoteNotes: data.quoteNotes !== undefined ? data.quoteNotes.trim() || null : undefined,
      startDate: data.startDate !== undefined ? (data.startDate === null ? null : new Date(data.startDate)) : undefined,
      dueDate: data.dueDate !== undefined ? (data.dueDate === null ? null : new Date(data.dueDate)) : undefined,
    },
  });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true };
}

/* ══ Tareas ═══════════════════════════════════════════════════════════ */

// Solo el partner agrega tareas; el orden se calcula al final de la lista.
export async function addProjectTask(projectId: string, title: string): Promise<Result<{ taskId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return { ok: false, error: "El título de la tarea es obligatorio." };

  const auth = await getProjectAuth(projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Proyecto no encontrado." };
  const { isPartner } = auth;
  if (!isPartner) {
    return { ok: false, error: "Solo el partner puede agregar tareas." };
  }

  const taskCount = await prisma.projectTask.count({ where: { projectId } });

  const task = await prisma.projectTask.create({
    data: { projectId, title: trimmedTitle, order: taskCount },
    select: { id: true },
  });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true, taskId: task.id };
}

// Transiciones permitidas: el partner mueve pending ↔ in_review (para pedir
// aprobación o retomar el trabajo); el cliente resuelve in_review →
// approved (aprueba) o in_review → pending (rechaza). Una tarea approved
// queda inmutable para ambas partes.
export async function updateTaskStatus(taskId: string, status: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };
  if (!TASK_STATUSES.includes(status as TaskStatus)) {
    return { ok: false, error: "Estatus de tarea inválido." };
  }

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { status: true, projectId: true },
  });
  if (!task) return { ok: false, error: "Tarea no encontrada." };

  const auth = await getProjectAuth(task.projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Tarea no encontrada." };
  const { isClient, isPartner } = auth;
  if (!isClient && !isPartner) return { ok: false, error: "No autorizado" };

  if (task.status === "approved") {
    return { ok: false, error: "La tarea ya fue aprobada y no puede cambiar de estatus." };
  }

  const next = status as TaskStatus;
  const partnerTransition = isPartner && task.status === "pending" && next === "in_review";
  const partnerRevert = isPartner && task.status === "in_review" && next === "pending";
  const clientApprove = isClient && task.status === "in_review" && next === "approved";
  const clientReject = isClient && task.status === "in_review" && next === "pending";

  if (!partnerTransition && !partnerRevert && !clientApprove && !clientReject) {
    return { ok: false, error: "Transición de estatus no permitida para tu rol." };
  }

  await prisma.projectTask.update({ where: { id: taskId }, data: { status: next } });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true };
}

// Solo el partner elimina tareas, y nunca si ya fueron aprobadas.
export async function deleteProjectTask(taskId: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: { status: true, projectId: true },
  });
  if (!task) return { ok: false, error: "Tarea no encontrada." };

  const auth = await getProjectAuth(task.projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Tarea no encontrada." };
  const { isPartner } = auth;
  if (!isPartner) {
    return { ok: false, error: "Solo el partner puede eliminar tareas." };
  }
  if (task.status === "approved") {
    return { ok: false, error: "No se puede eliminar una tarea ya aprobada." };
  }

  await prisma.projectTask.delete({ where: { id: taskId } });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true };
}

/* ══ Links de archivos externos ═══════════════════════════════════════ */

// Cualquiera de las dos partes puede agregar un link; se valida que sea
// http(s) real y no apunte a la propia plataforma.
export async function addProjectLink(
  projectId: string,
  label: string,
  url: string,
): Promise<Result<{ linkId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { ok: false, error: "La etiqueta del link es obligatoria." };

  const validUrl = validateExternalUrl(url);
  if (!validUrl) return { ok: false, error: "La URL no es válida." };

  const auth = await getProjectAuth(projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Proyecto no encontrado." };
  const { isClient, isPartner } = auth;
  if (!isClient && !isPartner) {
    return { ok: false, error: "No autorizado" };
  }

  // El tipo se infiere del rol de quien sube el link, nunca se recibe como
  // input del cliente: brand = assets de marca (sube el cliente), final =
  // activos finales (sube cualquier partner/colaborador).
  const link = await prisma.projectLink.create({
    data: {
      projectId,
      label: trimmedLabel,
      url: validUrl,
      provider: detectProvider(validUrl),
      addedById: userId,
      type: isClient ? "brand" : "final",
    },
    select: { id: true },
  });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true, linkId: link.id };
}

// Quien agregó el link, o el cliente dueño del proyecto, puede eliminarlo.
export async function deleteProjectLink(linkId: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const link = await prisma.projectLink.findUnique({
    where: { id: linkId },
    select: { addedById: true, projectId: true },
  });
  if (!link) return { ok: false, error: "Link no encontrado." };

  const auth = await getProjectAuth(link.projectId, userId);
  if (!auth.ok) return { ok: false, error: auth.error ?? "Link no encontrado." };
  const { isClient } = auth;

  if (link.addedById !== userId && !isClient) {
    return { ok: false, error: "No autorizado" };
  }

  await prisma.projectLink.delete({ where: { id: linkId } });

  revalidateUsernames(auth.clientUsername, auth.partnerUsername);
  return { ok: true };
}

/* ══ Recursos del cliente ("Mis recursos") ════════════════════════════ */

// Solo un cliente crea recursos propios; se guardan como link externo.
export async function addClientResource(
  label: string,
  url: string,
  description?: string,
): Promise<Result<{ resourceId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, username: true } });
  if (!user || user.role !== "client") {
    return { ok: false, error: "Solo disponible para clientes." };
  }

  const trimmedLabel = label.trim();
  if (!trimmedLabel) return { ok: false, error: "La etiqueta del recurso es obligatoria." };

  const validUrl = validateExternalUrl(url);
  if (!validUrl) return { ok: false, error: "La URL no es válida." };

  const resource = await prisma.clientResource.create({
    data: {
      label: trimmedLabel,
      url: validUrl,
      provider: detectProvider(validUrl),
      description: description?.trim() || null,
      ownerId: userId,
    },
    select: { id: true },
  });

  revalidateUsernames(user.username);
  return { ok: true, resourceId: resource.id };
}

export interface UpdateClientResourceInput {
  label?: string;
  url?: string;
  description?: string;
  sharedWith?: string[];
}

// Solo el dueño edita su recurso. sharedWith se filtra silenciosamente a los
// partnerIds con Connection ACCEPTED del dueño (nunca se comparte con quien
// no tiene una conexión aceptada).
export async function updateClientResource(
  resourceId: string,
  data: UpdateClientResourceInput,
): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const resource = await prisma.clientResource.findUnique({
    where: { id: resourceId },
    select: { ownerId: true },
  });
  if (!resource || resource.ownerId !== userId) return { ok: false, error: "No autorizado" };

  let validUrl: string | undefined;
  if (data.url !== undefined) {
    const parsed = validateExternalUrl(data.url);
    if (!parsed) return { ok: false, error: "La URL no es válida." };
    validUrl = parsed;
  }

  let sharedWith: string[] | undefined;
  if (data.sharedWith !== undefined) {
    const accepted = await prisma.connection.findMany({
      where: { clientId: userId, status: "ACCEPTED", partnerId: { in: data.sharedWith } },
      select: { partnerId: true },
    });
    sharedWith = accepted.map((connection) => connection.partnerId);
  }

  const owner = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  await prisma.clientResource.update({
    where: { id: resourceId },
    data: {
      label: data.label !== undefined ? data.label.trim() || undefined : undefined,
      url: validUrl,
      description: data.description !== undefined ? data.description.trim() || null : undefined,
      sharedWith,
    },
  });

  revalidateUsernames(owner?.username);
  return { ok: true };
}

// Solo el dueño elimina su recurso.
export async function deleteClientResource(resourceId: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const resource = await prisma.clientResource.findUnique({
    where: { id: resourceId },
    select: { ownerId: true },
  });
  if (!resource || resource.ownerId !== userId) return { ok: false, error: "No autorizado" };

  await prisma.clientResource.delete({ where: { id: resourceId } });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  revalidateUsernames(user?.username);
  return { ok: true };
}
