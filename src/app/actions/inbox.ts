"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ProjectMemberRole } from "@/generated/prisma/client";
import { requireProjectMember } from "./channels";

/* ══ Bandeja unificada de /mensajes (chat-messenger-refactor.md 2/3) ═════
   Combina hilos directos (DirectThread) y canales de proyecto activos
   (ProjectChannel) en una sola lista ordenada por actividad reciente, más
   el contexto de un canal para el panel derecho. ═══════════════════════ */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface ConversationParticipant {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  headline: string | null;
  role: string;
}

export interface ConversationSummary {
  key: string;
  kind: "direct" | "group";
  threadId?: string;
  channelId?: string;
  title: string;
  subtitle: string | null;
  avatarUrl: string | null;
  participant?: ConversationParticipant;
  project?: { id: string; title: string };
  lastMessage: { body: string; createdAt: string; senderName: string | null } | null;
  unreadCount: number;
  lastActivityAt: string;
}

export interface ChannelContextParticipant {
  id: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  roles: ProjectMemberRole[];
}

export interface ChannelContextTask {
  id: string;
  title: string;
  status: string;
  description: string | null;
  dueDate: string | null;
  assignee: {
    id: string;
    name: string | null;
    username: string | null;
    imageUrl: string | null;
  } | null;
  asset: { id: string; title: string } | null;
}

export interface ChannelContextData {
  channel: { id: string; name: string };
  project: { id: string; title: string; status: string };
  isAdmin: boolean;
  participants: ChannelContextParticipant[];
  partnerParticipants: string[];
  tasks: ChannelContextTask[];
  assets: { id: string; title: string }[];
}

async function requireAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

export async function getInbox(): Promise<Result<{ conversations: ConversationSummary[] }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const [directThreads, projects] = await Promise.all([
    prisma.directThread.findMany({
      where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            username: true,
            imageUrl: true,
            role: true,
            headline: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            username: true,
            imageUrl: true,
            role: true,
            headline: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true, createdAt: true, sender: { select: { name: true } } },
        },
      },
    }),
    prisma.collabProject.findMany({
      where: {
        status: "active",
        OR: [
          { connection: { clientId: userId } },
          { connection: { partnerId: userId } },
          { collaborators: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        title: true,
        channels: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { body: true, createdAt: true, sender: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const unreadCounts = directThreads.length
    ? await prisma.directMessage.groupBy({
        by: ["threadId"],
        where: {
          threadId: { in: directThreads.map((thread) => thread.id) },
          readAt: null,
          senderId: { not: userId },
        },
        _count: { _all: true },
      })
    : [];
  const unreadMap = new Map(unreadCounts.map((entry) => [entry.threadId, entry._count._all]));

  const directConversations: ConversationSummary[] = directThreads.map((thread) => {
    const otherParticipant = thread.initiatorId === userId ? thread.recipient : thread.initiator;
    const lastMessage = thread.messages[0] ?? null;
    const lastActivityDate = lastMessage ? lastMessage.createdAt : thread.createdAt;
    return {
      key: `direct:${thread.id}`,
      kind: "direct",
      threadId: thread.id,
      title: otherParticipant.name ?? otherParticipant.username ?? "Usuario",
      subtitle: otherParticipant.headline,
      avatarUrl: otherParticipant.imageUrl,
      participant: otherParticipant,
      lastMessage: lastMessage
        ? {
            body: lastMessage.body,
            createdAt: lastMessage.createdAt.toISOString(),
            senderName: lastMessage.sender.name,
          }
        : null,
      unreadCount: unreadMap.get(thread.id) ?? 0,
      lastActivityAt: lastActivityDate.toISOString(),
    };
  });

  // ChannelMessage no tiene modelo de lectura por usuario (sin campo readAt ni
  // tabla de recibos, a diferencia de DirectMessage): unreadCount de los
  // canales grupales queda fijo en 0 hasta que se agregue esa pieza de datos.
  const groupConversations: ConversationSummary[] = projects.flatMap((project) =>
    project.channels.map((channel) => {
      const lastMessage = channel.messages[0] ?? null;
      const lastActivityDate = lastMessage ? lastMessage.createdAt : channel.createdAt;
      return {
        key: `group:${channel.id}`,
        kind: "group",
        channelId: channel.id,
        title: channel.name,
        subtitle: project.title,
        avatarUrl: null,
        project: { id: project.id, title: project.title },
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: lastMessage.createdAt.toISOString(),
              senderName: lastMessage.sender.name,
            }
          : null,
        unreadCount: 0,
        lastActivityAt: lastActivityDate.toISOString(),
      };
    }),
  );

  const conversations = [...directConversations, ...groupConversations].sort(
    (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
  );

  return { ok: true, conversations };
}

export async function getChannelContext(channelId: string): Promise<Result<ChannelContextData>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const channel = await prisma.projectChannel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, projectId: true },
  });
  if (!channel) return { ok: false, error: "Canal no encontrado." };

  const member = await requireProjectMember(channel.projectId, userId);
  if (!member.ok) return { ok: false, error: member.error ?? "No autorizado" };

  const project = await prisma.collabProject.findUnique({
    where: { id: channel.projectId },
    select: {
      id: true,
      title: true,
      status: true,
      connection: {
        select: {
          clientId: true,
          partnerId: true,
          client: { select: { id: true, name: true, username: true, imageUrl: true } },
          partner: { select: { id: true, name: true, username: true, imageUrl: true } },
        },
      },
      collaborators: {
        select: { user: { select: { id: true, name: true, username: true, imageUrl: true } } },
      },
      roleAssignments: { select: { userId: true, role: true } },
      assets: { select: { id: true, title: true } },
      tasks: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          description: true,
          dueDate: true,
          assignee: { select: { id: true, name: true, username: true, imageUrl: true } },
          asset: { select: { id: true, title: true } },
        },
      },
    },
  });
  if (!project) return { ok: false, error: "Proyecto no encontrado." };

  const rolesByUser = new Map<string, ProjectMemberRole[]>();
  for (const assignment of project.roleAssignments) {
    const current = rolesByUser.get(assignment.userId) ?? [];
    current.push(assignment.role);
    rolesByUser.set(assignment.userId, current);
  }

  const participants: ChannelContextParticipant[] = [
    { ...project.connection.client, roles: [] },
    { ...project.connection.partner, roles: rolesByUser.get(project.connection.partnerId) ?? [] },
    ...project.collaborators.map((collaborator) => ({
      ...collaborator.user,
      roles: rolesByUser.get(collaborator.user.id) ?? [],
    })),
  ];

  const partnerParticipants = [
    project.connection.partnerId,
    ...project.collaborators.map((collaborator) => collaborator.user.id),
  ];

  return {
    ok: true,
    channel: { id: channel.id, name: channel.name },
    project: { id: project.id, title: project.title, status: project.status },
    isAdmin: userId === project.connection.clientId,
    participants,
    partnerParticipants,
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      description: task.description,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      assignee: task.assignee,
      asset: task.asset,
    })),
    assets: project.assets,
  };
}
