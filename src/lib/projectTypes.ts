/* ══ Árbol Tipo → Subtipos de proyecto ═════════════════════════════════
   Extraído tal cual de CATALOGOS en src/components/servicios/Cotizador.tsx
   (mismos labels de disciplina e items), para categorizar CollabProject
   desde el panel de administración (CollabProject.projectType/projectSubtype).
   ══════════════════════════════════════════════════════════════════════ */

export const PROJECT_TYPES = ["Diseño gráfico", "Ilustración digital", "Motion / Animación"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_SUBTYPES: Record<ProjectType, string[]> = {
  "Diseño gráfico": [
    "Logotipo",
    "Branding completo",
    "Rebranding",
    "Manual de marca",
    "Pieza comercial",
    "Kit de redes sociales",
    "Paquetería de marketing",
    "Diseño editorial",
    "Empaque / Etiqueta",
    "Presentación corporativa",
    "Diseño web / UI",
  ],
  "Ilustración digital": [
    "Diseño de personajes",
    "Diseño de escenarios",
    "Mascota de marca",
    "Ilustración editorial",
    "Ilustración publicitaria",
    "Concept art",
    "Set de íconos / stickers",
    "Retrato / avatar",
    "Patrón repetible",
    "Infografía ilustrada",
  ],
  "Motion / Animación": [
    "Logo animado",
    "Pleca animada (lower third)",
    "Videobug",
    "Wipper / cortinilla",
    "Intro / outro",
    "Paquete gráfico completo",
    "Post animado para redes",
    "Reel / story animado",
    "Video explicativo",
    "Kinetic typography",
    "GIF / sticker animado",
  ],
};

export function isValidProjectType(value: string): value is ProjectType {
  return (PROJECT_TYPES as readonly string[]).includes(value);
}

export function isValidProjectSubtype(type: string, subtype: string): boolean {
  if (!isValidProjectType(type)) return false;
  return PROJECT_SUBTYPES[type].includes(subtype);
}

/* ══ Etiquetas de archivo (ProjectLink.subtype) ════════════════════════ */

export const FILE_SUBTYPES = ["documento", "grafico", "recurso", "video", "otro"] as const;

export type FileSubtype = (typeof FILE_SUBTYPES)[number];

export const FILE_SUBTYPE_LABELS: Record<FileSubtype, string> = {
  documento: "Documento",
  grafico: "Gráfico",
  recurso: "Recurso",
  video: "Video",
  otro: "Otro",
};

export function isValidFileSubtype(value: string): value is FileSubtype {
  return (FILE_SUBTYPES as readonly string[]).includes(value);
}
