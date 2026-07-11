/* ══ Presencia del messenger ═══════════════════════════════════════════
   Helper puro (sin Prisma) para derivar el estado visible de un usuario a
   partir de su heartbeat (lastSeenAt) y su estado manual (presenceStatus).
   Importable tanto desde server actions como desde client components. ═══ */

const ONLINE_WINDOW_MS = 3 * 60 * 1000;

export type PresenceState = "online" | "busy" | "offline";

// busy: el usuario se marcó "busy" a mano Y sigue activo (heartbeat reciente).
// Si dejó de mandar heartbeat, prevalece offline aunque haya quedado en "busy".
// online: heartbeat dentro de la ventana de 3 minutos.
// offline: sin heartbeat reciente (o nunca reportó actividad).
export function derivePresence(
  lastSeenAt: Date | string | null,
  presenceStatus: string | null,
): PresenceState {
  if (!lastSeenAt) return "offline";
  const lastSeenTime =
    lastSeenAt instanceof Date ? lastSeenAt.getTime() : new Date(lastSeenAt).getTime();
  if (Number.isNaN(lastSeenTime)) return "offline";
  const isRecent = Date.now() - lastSeenTime < ONLINE_WINDOW_MS;
  if (!isRecent) return "offline";
  if (presenceStatus === "busy") return "busy";
  return "online";
}
