import type { ContestApplicationStatus } from "@/generated/prisma/client";
import type { ContestPhase } from "@/lib/contests";

/* ══ Brief-hub: presentación de fase/estado ══════════════════════════════
   Capa puramente de UI (labels en español + token de color de Tag), mismo
   patrón que src/lib/projectStatus.ts (STATUS_LABELS + variant map). No
   toca la máquina de estados real (deriveContestPhase, src/lib/contests.ts).
   ═════════════════════════════════════════════════════════════════════ */

export type ContestTagVariant =
  | "neutral"
  | "brand"
  | "accent"
  | "info"
  | "danger"
  | "warning"
  | "success";

export const CONTEST_PHASE_LABELS: Record<ContestPhase, string> = {
  draft: "Borrador",
  applications: "Postulaciones abiertas",
  applicationsClosed: "Postulaciones cerradas",
  production: "En producción",
  judging: "En dictamen",
  awarded: "Fallo emitido",
  cancelled: "Cancelada",
  breached: "Incumplida",
};

export const CONTEST_PHASE_VARIANTS: Record<ContestPhase, ContestTagVariant> = {
  draft: "neutral",
  applications: "brand",
  applicationsClosed: "warning",
  production: "accent",
  judging: "warning",
  awarded: "success",
  cancelled: "neutral",
  breached: "danger",
};

export function contestPhaseTag(phase: ContestPhase): { label: string; variant: ContestTagVariant } {
  return { label: CONTEST_PHASE_LABELS[phase], variant: CONTEST_PHASE_VARIANTS[phase] };
}

export const CONTEST_APPLICATION_STATUS_LABELS: Record<ContestApplicationStatus, string> = {
  SUBMITTED: "Postulación enviada",
  SHORTLISTED: "Seleccionado en la Terna",
  REJECTED: "No seleccionada",
  WITHDRAWN: "Retirada",
};

export const CONTEST_APPLICATION_STATUS_VARIANTS: Record<ContestApplicationStatus, ContestTagVariant> = {
  SUBMITTED: "info",
  SHORTLISTED: "success",
  REJECTED: "neutral",
  WITHDRAWN: "neutral",
};

export function contestApplicationStatusTag(
  status: ContestApplicationStatus,
): { label: string; variant: ContestTagVariant } {
  return {
    label: CONTEST_APPLICATION_STATUS_LABELS[status],
    variant: CONTEST_APPLICATION_STATUS_VARIANTS[status],
  };
}

// Formato de dinero es-MX (mismo patrón que src/components/servicios/Cotizador.tsx).
export function formatContestMoney(amount: number, currency: string = "MXN"): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Días restantes hasta una fecha ISO (redondeado hacia arriba); negativo si
// ya pasó. Usado para "cierra en N días" en las tarjetas del listado.
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function daysUntilLabel(iso: string, now: Date = new Date()): string {
  const days = daysUntil(iso, now);
  if (days < 0) return "Cierre pasado";
  if (days === 0) return "Cierra hoy";
  if (days === 1) return "Cierra mañana";
  return `Cierra en ${days} días`;
}
