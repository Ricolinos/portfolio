"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/* ══ Presencia del messenger ═══════════════════════════════════════════
   Heartbeat barato + estado manual. El helper puro que deriva online/busy/
   offline vive en src/lib/presence.ts (derivePresence), sin depender de
   Prisma, para poder importarlo también desde client components. ═══════ */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function requireAuth(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

// Idempotente y barata: el cliente la llama cada ~60s mientras la pestaña de
// /mensajes está activa para refrescar User.lastSeenAt.
export async function presenceHeartbeat(): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  await prisma.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });

  return { ok: true };
}

export async function setPresenceStatus(status: "auto" | "busy"): Promise<Result> {
  const userId = await requireAuth();
  if (!userId) return { ok: false, error: "No autenticado" };

  await prisma.user.update({
    where: { id: userId },
    data: { presenceStatus: status === "busy" ? "busy" : null },
  });

  return { ok: true };
}
