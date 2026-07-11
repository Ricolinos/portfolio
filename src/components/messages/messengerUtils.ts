import { ProjectMemberRole } from "@/generated/prisma/enums";
import type { DirectMessageData } from "@/app/actions/directMessages";
import type { ChannelMessageData } from "@/app/actions/channels";

/* ══ Utilidades compartidas de MessengerView (chat-messenger-refactor.md) ══
   Helpers puros (sin JSX): formateo de tiempo, normalización de mensajes
   directos/canal a un tipo único de stream, parseo de URLs multimedia y
   constantes de estado de tarea / roles reutilizadas entre paneles. ═══════ */

export interface PersonLike {
  name: string | null;
  username: string | null;
}

export function personLabel(person: PersonLike): string {
  return person.name ?? person.username ?? "Usuario";
}

export function personInitial(person: PersonLike): string {
  return (person.name?.[0] ?? person.username?.[0] ?? "U").toUpperCase();
}

// Hora corta si el mensaje es de hoy, fecha corta en otro caso.
export function formatShortTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

/* ══ Stream unificado de mensajes (direct + channel) ═══════════════════ */

export interface StreamMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; username: string | null; imageUrl: string | null };
  task: ChannelMessageData["task"];
}

export function fromDirectMessage(message: DirectMessageData): StreamMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    sender: message.sender,
    task: null,
  };
}

export function fromChannelMessage(message: ChannelMessageData): StreamMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    sender: message.sender,
    task: message.task,
  };
}

/* ══ Detección de multimedia embebida en el cuerpo del mensaje ═════════ */

const URL_REGEX = /https?:\/\/[^\s]+/g;
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp)(\?[^\s]*)?$/i;

export interface MessageBodyPart {
  text: string;
  url?: string;
}

export interface ParsedMessageBody {
  parts: MessageBodyPart[];
  images: string[];
}

// Separa el cuerpo del mensaje en fragmentos de texto/enlace, y extrae aparte
// las URLs que apuntan a imágenes para renderizarlas como Media además del
// texto (no en vez de).
export function parseMessageBody(body: string): ParsedMessageBody {
  const parts: MessageBodyPart[] = [];
  const images: string[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(URL_REGEX)) {
    const url = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) parts.push({ text: body.slice(lastIndex, index) });
    if (IMAGE_EXT_REGEX.test(url)) {
      images.push(url);
    } else {
      parts.push({ text: url, url });
    }
    lastIndex = index + url.length;
  }
  if (lastIndex < body.length) parts.push({ text: body.slice(lastIndex) });
  if (parts.length === 0 && body.length === 0) parts.push({ text: "" });

  return { parts, images };
}

/* ══ Estados de tarea (mismo mapeo que ProjectChat) ═════════════════════ */

export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_review: "En revisión",
  pending_approval: "Por aprobar",
  approved: "Aprobada",
  rejected: "Rechazada",
};

export const TASK_STATUS_VARIANTS: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  pending: "neutral",
  in_review: "neutral",
  pending_approval: "warning",
  approved: "success",
  rejected: "danger",
};

/* ══ Roles del proyecto (ENUM PLANNER/REALIZADOR/DESIGNER/EDITOR) ═══════ */

export const ROLE_LABELS: Record<ProjectMemberRole, string> = {
  PLANNER: "Planner",
  REALIZADOR: "Realizador",
  DESIGNER: "Designer",
  EDITOR: "Editor",
};

export const ROLE_OPTIONS = Object.values(ProjectMemberRole);

/* ══ Riel de proyectos: scope activo de la bandeja (Directos vs. proyecto) ══ */

export type RailScope = { type: "direct" } | { type: "project"; id: string };

export function sameScope(a: RailScope, b: RailScope): boolean {
  if (a.type !== b.type) return false;
  return a.type === "project" && b.type === "project" ? a.id === b.id : true;
}
