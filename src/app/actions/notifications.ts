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

export async function getNotifications(
  limit = 30,
): Promise<Result<{ notifications: NotificationData[] }>> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    ok: true,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      payload: notification.payload,
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      createdAt: notification.createdAt.toISOString(),
    })),
  };
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
