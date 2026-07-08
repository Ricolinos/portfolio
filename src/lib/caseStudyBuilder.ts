// Tipos, límites y serializador del panel de creación de casos de estudio.
// Sin dependencias de servidor: lo importan tanto el dialog (cliente) como
// la server action que valida y persiste.

export type SectionKind =
  | "titulo"
  | "subtitulo"
  | "texto"
  | "portada"
  | "carousel"
  | "comparador"
  | "colaboradores";

export interface CollaboratorRef {
  username: string;
  name: string | null;
  imageUrl: string | null;
}

export type CaseStudySection =
  | { kind: "titulo"; text: string }
  | { kind: "subtitulo"; text: string }
  | { kind: "texto"; text: string }
  // src: URL servida por /api/media/<id> (subida previa vía uploadCaseStudyMedia)
  | { kind: "portada"; src: string }
  | { kind: "carousel"; images: string[] }
  | { kind: "comparador"; left: string; right: string }
  | { kind: "colaboradores"; usernames: string[] };

export interface CaseStudyDraft {
  category: string;
  isPublic: boolean;
  sections: CaseStudySection[];
}

// Máximo de secciones de cada tipo por proyecto.
export const SECTION_LIMITS: Record<SectionKind, number> = {
  titulo: 1,
  subtitulo: 5,
  texto: 5,
  portada: 1,
  carousel: 3,
  comparador: 3,
  colaboradores: 1,
};

export const MAX_CAROUSEL_IMAGES = 4;
export const SECTION_LABELS: Record<SectionKind, string> = {
  titulo: "Título",
  subtitulo: "Subtítulo",
  texto: "Texto",
  portada: "Portada",
  carousel: "Carousel de imágenes",
  comparador: "Comparador",
  colaboradores: "Colaboradores",
};

export function countSections(sections: CaseStudySection[]) {
  const counts = {} as Record<SectionKind, number>;
  for (const kind of Object.keys(SECTION_LIMITS) as SectionKind[]) counts[kind] = 0;
  for (const section of sections) counts[section.kind] += 1;
  return counts;
}

// Escapa lo que rompería la compilación MDX en texto libre del usuario
// (< abre JSX y { abre una expresión).
function escapeMdxText(value: string): string {
  return value.replace(/([<{])/g, "\\$1");
}

// Los strings dentro de atributos JSX y del frontmatter van como JSON:
// un string JSON es un escalar YAML válido y un literal JS válido.
const str = (value: string) => JSON.stringify(value);

export interface BuildMdxInput {
  draft: CaseStudyDraft;
  title: string;
  summary: string;
  cover: string;
  publishedAt: string; // YYYY-MM-DD
  collaborators: CollaboratorRef[];
}

// Arma el archivo MDX final en el orden elegido por el Partner. El título y
// la portada no se repiten en el cuerpo: el visor ya los muestra desde el
// frontmatter como encabezado del caso de estudio.
export function buildCaseStudyMdx({
  draft,
  title,
  summary,
  cover,
  publishedAt,
  collaborators,
}: BuildMdxInput): string {
  const lines: string[] = [
    "---",
    `title: ${str(title)}`,
    `publishedAt: ${str(publishedAt)}`,
    `tag: ${str(draft.category)}`,
    `summary: ${str(summary)}`,
    "images:",
    `  - ${str(cover)}`,
    "---",
    "",
  ];

  for (const section of draft.sections) {
    switch (section.kind) {
      case "titulo":
      case "portada":
        break;
      case "subtitulo":
        lines.push(`## ${escapeMdxText(section.text.trim())}`, "");
        break;
      case "texto":
        lines.push(escapeMdxText(section.text.trim()), "");
        break;
      case "carousel": {
        const items = section.images
          .map((src, i) => `{ slide: ${str(src)}, alt: ${str(`Imagen ${i + 1} de ${title}`)} }`)
          .join(", ");
        lines.push(
          `<Carousel marginTop="8" marginBottom="16" radius="m" aspectRatio="16 / 9" indicator="thumbnail" sizes="(max-width: 960px) 100vw, 960px" items={[${items}]} />`,
          "",
        );
        break;
      }
      case "comparador":
        lines.push(
          `<CompareImage marginTop="8" marginBottom="16" radius="m" overflow="hidden" aspectRatio="16 / 9" leftContent={{ src: ${str(section.left)}, alt: "Antes" }} rightContent={{ src: ${str(section.right)}, alt: "Después" }} />`,
          "",
        );
        break;
      case "colaboradores": {
        const avatars = collaborators
          .map((c) =>
            c.imageUrl
              ? `{ src: ${str(c.imageUrl)} }`
              : `{ value: ${str((c.name ?? c.username)[0]?.toUpperCase() ?? "?")} }`,
          )
          .join(", ");
        const names = collaborators.map((c) => `@${c.username}`).join(", ");
        lines.push(
          `<Row gap="12" vertical="center" marginTop="16" marginBottom="16">`,
          `  <AvatarGroup size="m" avatars={[${avatars}]} />`,
          `  <Text variant="label-default-m" onBackground="neutral-weak">Colaboradores: ${escapeMdxText(names)}</Text>`,
          `</Row>`,
          "",
        );
        break;
      }
    }
  }

  return lines.join("\n");
}
