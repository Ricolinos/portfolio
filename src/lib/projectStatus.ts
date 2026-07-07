// Estatus válidos de un ProjectQuote y sus etiquetas en español.
// Módulo compartido server/client: NO agregar "use server".
export const PROJECT_STATUSES = ["draft", "sent", "active", "completed", "archived"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  active: "En progreso",
  completed: "Completada",
  archived: "Archivada",
};
