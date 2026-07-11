"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { NotificationType, Prisma } from "@/generated/prisma/client";

/* ══ Notificaciones del subsistema de mensajería/tareas ═══════════════
   Fila plana por evento (NEW_MESSAGE, TASK_ASSIGNED, TASK_STATUS_CHANGED);
   ver chat-requirements.md 3.4. Arranca con polling client-side, igual
   que directMessages.ts/channels.ts. ══════════════════════════════════ */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface NotificationData {
  id: string;
  type: NotificationType;
  payload: Prisma.JsonValue | null;
  readAt: string | null;
  createdAt: string;
}

async function requireAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

// Paginación simple por cursor (id de la última notificación ya cargada):
// pide `limit + 1` filas, si sobra una hay más páginas y se recorta.
export async function getNotifications(
  limit = 30,
  cursor?: string,
): Promise<Result<{ notifications: NotificationData[]; nextCursor: string | null }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    ok: true,
    notifications: page.map((notification) => ({
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

// Total de notificaciones no leídas del usuario, para el badge del panel de
// notificaciones del dashboard (Fase 6b).
export async function getUnreadNotificationCount(): Promise<Result<{ count: number }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const count = await prisma.notification.count({ where: { userId, readAt: null } });
  return { ok: true, count };
}

// Sin ids: marca todas las notificaciones no leídas del usuario. Con ids:
// solo marca las que pertenecen al usuario actual (evita marcar ajenas).
export async function markNotificationsRead(ids?: string[]): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids !== undefined ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });

  return { ok: true };
}

// Alias explícito de markNotificationsRead() sin ids, para el botón "marcar
// todas como leídas" del panel de notificaciones.
export async function markAllNotificationsRead(): Promise<Result> {
  return markNotificationsRead();
}
