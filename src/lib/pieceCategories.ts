// Taxonomía de PortfolioPiece (rediseño del editor, ver
// prisma/schema.prisma: category/subcategories/software). Módulo compartido
// server/client: NO agregar "use server".

import type { ColorScheme } from "@once-ui-system/core";

// Categoría raíz de la pieza (PortfolioPiece.category). Piezas viejas pueden
// traer un valor fuera de esta lista (ej. el default legacy "Documento"):
// se muestran igual, solo se valida contra esta lista el valor ENTRANTE al
// crear/actualizar desde el editor nuevo (ver actions/portfolioPieces.ts).
export const PIECE_CATEGORIES = [
  "Animación",
  "Diseño",
  "Ilustración",
  "Modelado 3D",
  "Programación",
  "UX/UI",
  "Fotografía",
  "Branding",
  "Motion Design",
] as const;

export type PieceCategory = (typeof PIECE_CATEGORIES)[number];

export function isValidPieceCategory(value: string): value is PieceCategory {
  return (PIECE_CATEGORIES as readonly string[]).includes(value);
}

// Mapea una categoría de pieza a su sección en /explorar, cuando existe un
// slug dedicado (ver CATEGORY_SLUGS en src/components/explore/categories.ts).
// No se crean rutas nuevas: las categorías sin slug propio caen a /explorar.
const CATEGORY_TO_EXPLORE_SLUG: Partial<Record<PieceCategory, string>> = {
  Animación: "animacion",
  Branding: "branding",
  Ilustración: "ilustracion",
};

export function categoryExploreHref(category: string): string {
  const slug = CATEGORY_TO_EXPLORE_SLUG[category as PieceCategory];
  return slug ? `/explorar/${slug}` : "/explorar";
}

// --- Software / herramientas -------------------------------------------
//
// Paleta de color por software (PortfolioPiece.software), usando SOLO
// variantes nativas de Tag de Once UI (ColorScheme + "gradient"). No hay un
// color por programa: se agrupan por familia (retoque, video, 3D, etc.) para
// que la paleta se mantenga corta y legible.
//
// Para agregar un programa nuevo: normaliza el nombre (normalizeSoftwareName)
// y agrega la entrada al diccionario SOFTWARE_VARIANTS de abajo. Cualquier
// software no listado cae a "neutral".

export type SoftwareTagVariant = ColorScheme | "gradient";

function normalizeSoftwareName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const SOFTWARE_VARIANTS: Record<string, SoftwareTagVariant> = {
  // Retoque / diseño de imagen (Adobe) → info (azul)
  photoshop: "info",
  lightroom: "info",
  // Vector / ilustración (Adobe) → warning (naranja)
  illustrator: "warning",
  indesign: "danger",
  // Video / motion (Adobe) → accent (morado)
  premiere: "accent",
  "premiere pro": "accent",
  "after effects": "accent",
  audition: "accent",
  // Edición de video no-Adobe → danger (rojo)
  davinci: "danger",
  "davinci resolve": "danger",
  "final cut": "danger",
  "final cut pro": "danger",
  // UI/UX y prototipado → brand
  figma: "brand",
  "adobe xd": "brand",
  sketch: "brand",
  // 3D / motion 3D → warning / info
  blender: "warning",
  "cinema 4d": "info",
  maya: "warning",
  "3ds max": "warning",
  zbrush: "warning",
  // Motores de videojuego → neutral
  unity: "neutral",
  unreal: "neutral",
  "unreal engine": "neutral",
  // Ilustración digital / dibujo → success (verde)
  procreate: "success",
  animate: "warning",
  "adobe animate": "warning",
  clipstudio: "success",
  "clip studio paint": "success",
};

export function softwareTagVariant(name: string): SoftwareTagVariant {
  return SOFTWARE_VARIANTS[normalizeSoftwareName(name)] ?? "neutral";
}
