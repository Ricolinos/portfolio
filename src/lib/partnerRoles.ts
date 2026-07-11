// Catálogo fijo de roles de especialidad para Partners (Fase 4, matriz de
// roles primario/secundario). Dominio: estudio de diseño gráfico y animación
// mexicano (branding, plecas, videobugs, wippers). Módulo compartido
// server/client: NO agregar "use server".
export const PARTNER_ROLES = [
  "Diseñador de Marca",
  "Motion Animator",
  "Ilustrador",
  "Diseñador Editorial",
  "Brander",
  "Animador 2D",
  "Editor de Video",
] as const;

export type PartnerRole = (typeof PARTNER_ROLES)[number];

export const MAX_SECONDARY_ROLES = 2;

export function isPartnerRole(value: string): value is PartnerRole {
  return (PARTNER_ROLES as readonly string[]).includes(value);
}
