"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { NotificationType, Prisma, ProjectMemberRole } from "@/generated/prisma/client";

/* ══ Mensajería robusta del proyecto + matriz de roles + pipeline ═════
   mensaje->tarea (chat-requirements.md 3.2/3.3). Todo este módulo exige
   project.status === "active": el chat colaborativo solo existe mientras
   el proyecto está en curso. ══════════════════════════════════════════ */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const MAX_MESSAGE_LENGTH = 4000;
const TASK_TITLE_LENGTH = 80;

async function requireAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export interface ProjectMemberAuth {
  ok: boolean;
  error?: string;
  isClient?: boolean;
  clientId?: string;
  // Partner "fundador" de la Connection (distinto de un ProjectCollaborator
  // adicional); solo él y el cliente pueden administrar el acceso a salas.
  partnerId?: string;
  status?: string;
  participantIds?: string[];
}

// Acceso al chat robusto: userId debe ser el client creador (connection.
// clientId), el partner fundador (connection.partnerId) o un colaborador
// adicional (ProjectCollaborator). Devuelve status y la lista completa de
// participantes para reutilizar en notificaciones masivas.
export async function requireProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectMemberAuth> {
  const project = await prisma.collabProject.findUnique({
    where: { id: projectId },
    select: {
      status: true,
      connection: { select: { clientId: true, partnerId: true } },
      collaborators: { select: { userId: true } },
    },
  });
  if (!project) return { ok: false, error: "Proyecto no encontrado." };

  const participantIds = [
    project.connection.clientId,
    project.connection.partnerId,
    ...project.collaborators.map((collaborator) => collaborator.userId),
  ];
  if (!participantIds.includes(userId)) return { ok: false, error: "No autorizado" };

  return {
    ok: true,
    isClient: project.connection.clientId === userId,
    clientId: project.connection.clientId,
    partnerId: project.connection.partnerId,
    status: project.status,
    participantIds,
  };
}

function assertActiveProject(status: string): { ok: false; error: string } | null {
  if (status !== "active") {
    return { ok: false, error: "El chat del proyecto solo está disponible en proyectos activos." };
  }
  return null;
}

/* ══ Control de acceso por sala (ChannelMember) ═══════════════════════════
   Un canal SIN filas de ChannelMember es abierto a todos los miembros del
   proyecto (retrocompatible con salas existentes); un canal CON filas queda
   restringido a esos usuarios + el cliente dueño del proyecto, que siempre
   puede entrar. Este helper centraliza la regla para no duplicarla entre
   getChannels, getChannelMessages, sendChannelMessage y getChannelContext. */

// Trae, para un lote de canales, el set de userIds con acceso explícito.
// Un canal ausente del mapa resultante está abierto (sin restricción).
async function getChannelMemberSets(channelIds: string[]): Promise<Map<string, Set<string>>> {
  if (channelIds.length === 0) return new Map();
  const rows = await prisma.channelMember.findMany({
    where: { channelId: { in: channelIds } },
    select: { channelId: true, userId: true },
  });
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = sets.get(row.channelId) ?? new Set<string>();
    set.add(row.userId);
    sets.set(row.channelId, set);
  }
  return sets;
}

function channelIsAccessible(
  memberSets: Map<string, Set<string>>,
  channelId: string,
  userId: string,
  isClient: boolean,
): boolean {
  const restrictedTo = memberSets.get(channelId);
  if (!restrictedTo) return true; // sala abierta, sin filas de ChannelMember
  return isClient || restrictedTo.has(userId);
}

// Verificación puntual (1 canal) para las acciones de mensajería. `isClient`
// debe venir de requireProjectMember (el dueño del proyecto siempre entra).
// Exportado para reutilizarse en inbox.ts (getChannelContext) sin duplicar
// la regla de acceso.
export async function requireChannelAccess(
  channelId: string,
  userId: string,
  isClient: boolean,
): Promise<Result> {
  const memberSets = await getChannelMemberSets([channelId]);
  if (!channelIsAccessible(memberSets, channelId, userId, isClient)) {
    return { ok: false, error: "No tienes acceso a esta sala." };
  }
  return { ok: true };
}

/* ══ Canales ═══════════════════════════════════════════════════════════ */

export interface ChannelData {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

function validateChannelName(name: string): Result<{ trimmed: string }> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) {
    return { ok: false, error: "El nombre del canal debe tener entre 1 y 60 caracteres." };
  }
  return { ok: true, trimmed };
}

// Solo el client creador del proyecto administra los canales.
export async function createChannel(
  projectId: string,
  name: string,
): Promise<Result<{ channelId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;
  if (!member.isClient) return { ok: false, error: "Solo el cliente puede crear canales." };

  const nameCheck = validateChannelName(name);
  if (!nameCheck.ok) return nameCheck;

  const channel = await prisma.projectChannel.create({
    data: { projectId, name: nameCheck.trimmed },
    select: { id: true },
  });

  revalidatePath(`/proyectos/${projectId}`);
  return { ok: true, channelId: channel.id };
}

export async function renameChannel(channelId: string, name: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;
  if (!member.isClient) return { ok: false, error: "Solo el cliente puede renombrar canales." };

  const nameCheck = validateChannelName(name);
  if (!nameCheck.ok) return nameCheck;

  await prisma.projectChannel.update({
    where: { id: channelId },
    data: { name: nameCheck.trimmed },
  });

  revalidatePath(`/proyectos/${channel.projectId}`);
  return { ok: true };
}

export async function deleteChannel(channelId: string): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;
  if (!member.isClient) return { ok: false, error: "Solo el cliente puede eliminar canales." };

  await prisma.projectChannel.delete({ where: { id: channelId } });

  revalidatePath(`/proyectos/${channel.projectId}`);
  return { ok: true };
}

export async function getChannels(projectId: string): Promise<Result<{ channels: ChannelData[] }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;

  const channels = await prisma.projectChannel.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { messages: true } } },
  });

  // Salas restringidas (con filas de ChannelMember) se ocultan a quien no
  // sea miembro explícito ni el cliente dueño del proyecto.
  const memberSets = await getChannelMemberSets(channels.map((channel) => channel.id));
  const visibleChannels = channels.filter((channel) =>
    channelIsAccessible(memberSets, channel.id, userId, member.isClient ?? false),
  );

  return {
    ok: true,
    channels: visibleChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      projectId: channel.projectId,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
      messageCount: channel._count.messages,
    })),
  };
}

/* ══ Mensajes de canal ═════════════════════════════════════════════════ */

export interface ChannelMessageData {
  id: string;
  channelId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; imageUrl: string | null };
  task: {
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    assignee: {
      id: string;
      name: string | null;
      username: string | null;
      imageUrl: string | null;
    } | null;
    asset: { id: string; title: string } | null;
  } | null;
}

export async function sendChannelMessage(
  channelId: string,
  body: string,
): Promise<Result<{ messageId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;

  const memberSets = await getChannelMemberSets([channelId]);
  if (!channelIsAccessible(memberSets, channelId, userId, member.isClient ?? false)) {
    return { ok: false, error: "No tienes acceso a esta sala." };
  }

  const trimmedBody = body.trim();
  if (!trimmedBody) return { ok: false, error: "El mensaje no puede estar vacío." };
  if (trimmedBody.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: "El mensaje es demasiado largo." };
  }

  const message = await prisma.channelMessage.create({
    data: { channelId, senderId: userId, body: trimmedBody },
    select: { id: true },
  });

  const recipients = member.participantIds!.filter(
    (id) => id !== userId && channelIsAccessible(memberSets, channelId, id, id === member.clientId),
  );
  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((recipientId) => ({
        userId: recipientId,
        type: NotificationType.NEW_MESSAGE,
        payload: { projectId: channel.projectId, channelId, messageId: message.id },
      })),
    });
  }

  revalidatePath(`/proyectos/${channel.projectId}`);
  return { ok: true, messageId: message.id };
}

export async function getChannelMessages(
  channelId: string,
): Promise<Result<{ messages: ChannelMessageData[] }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;

  const accessCheck = await requireChannelAccess(channelId, userId, member.isClient ?? false);
  if (!accessCheck.ok) return accessCheck;

  const messages = await prisma.channelMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, username: true, imageUrl: true } },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          assignee: { select: { id: true, name: true, username: true, imageUrl: true } },
          asset: { select: { id: true, title: true } },
        },
      },
    },
  });

  return {
    ok: true,
    messages: messages.map((message) => ({
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
      task: message.task
        ? {
            id: message.task.id,
            title: message.task.title,
            status: message.task.status,
            dueDate: message.task.dueDate ? message.task.dueDate.toISOString() : null,
            assignee: message.task.assignee,
            asset: message.task.asset,
          }
        : null,
    })),
  };
}

/* ══ Matriz de roles del proyecto ══════════════════════════════════════ */

export interface ProjectRoleData {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  createdAt: string;
  user: { id: string; name: string | null; username: string | null; imageUrl: string | null };
}

export async function getProjectRoles(
  projectId: string,
): Promise<Result<{ roles: ProjectRoleData[] }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;

  const roles = await prisma.projectRoleAssignment.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, username: true, imageUrl: true } } },
  });

  return {
    ok: true,
    roles: roles.map((role) => ({
      id: role.id,
      projectId: role.projectId,
      userId: role.userId,
      role: role.role,
      createdAt: role.createdAt.toISOString(),
      user: role.user,
    })),
  };
}

// Solo el client creador asigna roles, y únicamente a partners participantes
// del proyecto (fundador o colaborador adicional), nunca a sí mismo.
export async function assignProjectRole(
  projectId: string,
  targetUserId: string,
  role: ProjectMemberRole,
): Promise<Result<{ roleId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;
  if (!member.isClient) return { ok: false, error: "Solo el cliente puede asignar roles." };

  if (!Object.values(ProjectMemberRole).includes(role)) {
    return { ok: false, error: "Rol inválido." };
  }
  if (targetUserId === member.clientId || !member.participantIds!.includes(targetUserId)) {
    return { ok: false, error: "El usuario debe ser un partner participante del proyecto." };
  }

  try {
    const assignment = await prisma.projectRoleAssignment.create({
      data: { projectId, userId: targetUserId, role },
      select: { id: true },
    });
    revalidatePath(`/proyectos/${projectId}`);
    return { ok: true, roleId: assignment.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ese partner ya tiene ese rol." };
    }
    throw error;
  }
}

export async function removeProjectRole(
  projectId: string,
  targetUserId: string,
  role: ProjectMemberRole,
): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;
  if (!member.isClient) return { ok: false, error: "Solo el cliente puede quitar roles." };

  await prisma.projectRoleAssignment.deleteMany({
    where: { projectId, userId: targetUserId, role },
  });

  revalidatePath(`/proyectos/${projectId}`);
  return { ok: true };
}

/* ══ Pipeline mensaje -> tarea ═════════════════════════════════════════ */

export interface CreateTaskFromMessageInput {
  description?: string;
  assigneeId: string;
  assetId?: string;
  dueDate?: string;
}

// El caller solo necesita ser participante del proyecto (no forzosamente el
// cliente): cualquiera puede proponer convertir un mensaje en tarea, pero el
// responsable siempre debe ser un partner participante y la tarea nace
// "pending_approval" hasta que ese partner la resuelva.
export async function createTaskFromMessage(
  messageId: string,
  input: CreateTaskFromMessageInput,
): Promise<Result<{ taskId: string }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const message = await prisma.channelMessage.findUnique({
    where: { id: messageId },
    select: { id: true, body: true, channel: { select: { projectId: true } } },
  });
  if (!message) return { ok: false, error: "Mensaje no encontrado." };

  const projectId = message.channel.projectId;
  const member = await requireProjectMember(projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status!);
  if (activeError) return activeError;

  if (input.assigneeId === member.clientId || !member.participantIds!.includes(input.assigneeId)) {
    return { ok: false, error: "El responsable debe ser un partner participante del proyecto." };
  }
  const assignee = await prisma.user.findUnique({
    where: { id: input.assigneeId },
    select: { role: true },
  });
  if (!assignee || assignee.role !== "collaborator") {
    return { ok: false, error: "El responsable debe ser un partner." };
  }

  if (input.assetId) {
    const asset = await prisma.projectAsset.findUnique({
      where: { id: input.assetId },
      select: { projectId: true },
    });
    if (!asset || asset.projectId !== projectId) {
      return { ok: false, error: "El activo no pertenece a este proyecto." };
    }
  }

  let dueDate: Date | undefined;
  if (input.dueDate !== undefined) {
    const parsed = new Date(input.dueDate);
    if (Number.isNaN(parsed.getTime()))
      return { ok: false, error: "La fecha límite no es válida." };
    dueDate = parsed;
  }

  const description = input.description?.trim() || message.body;
  const title = description.slice(0, TASK_TITLE_LENGTH);

  try {
    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title,
        description,
        status: "pending_approval",
        assigneeId: input.assigneeId,
        assetId: input.assetId ?? null,
        dueDate: dueDate ?? null,
        sourceMessageId: messageId,
      },
      select: { id: true },
    });

    await prisma.notification.create({
      data: {
        userId: input.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        payload: { projectId, taskId: task.id },
      },
    });

    revalidatePath(`/proyectos/${projectId}`);
    return { ok: true, taskId: task.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Este mensaje ya tiene una tarea vinculada." };
    }
    throw error;
  }
}

// Solo el partner asignado resuelve su propia tarea pendiente de aprobación.
export async function resolveTaskApproval(taskId: string, approve: boolean): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const task = await prisma.projectTask.findUnique({
    where: { id: taskId },
    select: {
      status: true,
      assigneeId: true,
      projectId: true,
      project: { select: { status: true, connection: { select: { clientId: true } } } },
    },
  });
  if (!task) return { ok: false, error: "Tarea no encontrada." };

  const activeError = assertActiveProject(task.project.status);
  if (activeError) return activeError;
  if (task.assigneeId !== userId) {
    return { ok: false, error: "Solo el responsable asignado puede resolver esta tarea." };
  }
  if (task.status !== "pending_approval") {
    return { ok: false, error: "Esta tarea ya no está pendiente de aprobación." };
  }

  const status = approve ? "approved" : "rejected";
  await prisma.projectTask.update({ where: { id: taskId }, data: { status } });

  await prisma.notification.create({
    data: {
      userId: task.project.connection.clientId,
      type: NotificationType.TASK_STATUS_CHANGED,
      payload: { projectId: task.projectId, taskId, status },
    },
  });

  revalidatePath(`/proyectos/${task.projectId}`);
  return { ok: true };
}

/* ══ Membresía de salas (control de acceso) ═══════════════════════════════ */

export interface ChannelMemberData {
  userId: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
}

export async function getChannelMembers(
  channelId: string,
): Promise<Result<{ members: ChannelMemberData[]; restricted: boolean }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };

  const accessCheck = await requireChannelAccess(channelId, userId, member.isClient ?? false);
  if (!accessCheck.ok) return accessCheck;

  const rows = await prisma.channelMember.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true, username: true, imageUrl: true } } },
  });

  return {
    ok: true,
    restricted: rows.length > 0,
    members: rows.map((row) => ({
      userId: row.user.id,
      name: row.user.name,
      username: row.user.username,
      imageUrl: row.user.imageUrl,
    })),
  };
}

// Solo el cliente dueño del proyecto o el partner fundador de la Connection
// pueden configurar el acceso de una sala (mismo criterio de administración
// que createChannel/renameChannel, extendido al partner fundador). userIds
// vacío deja la sala abierta a todo el proyecto; cada id debe pertenecer a
// los participantes reales del proyecto (member.participantIds).
export async function setChannelMembers(channelId: string, userIds: string[]): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "Proyecto no encontrado." };
  const activeError = assertActiveProject(member.status ?? "");
  if (activeError) return activeError;

  if (!member.isClient && userId !== member.partnerId) {
    return {
      ok: false,
      error: "Solo el cliente o el partner fundador pueden configurar el acceso a la sala.",
    };
  }

  const uniqueUserIds = Array.from(new Set(userIds));
  const invalidUserId = uniqueUserIds.find((id) => !member.participantIds?.includes(id));
  if (invalidUserId) {
    return { ok: false, error: "Todos los usuarios deben ser participantes del proyecto." };
  }

  await prisma.$transaction([
    prisma.channelMember.deleteMany({ where: { channelId } }),
    ...(uniqueUserIds.length > 0
      ? [
          prisma.channelMember.createMany({
            data: uniqueUserIds.map((memberId) => ({ channelId, userId: memberId })),
          }),
        ]
      : []),
  ]);

  revalidatePath(`/proyectos/${channel.projectId}`);
  return { ok: true };
}
