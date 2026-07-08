import fs from "fs";
import path from "path";
import { getPosts } from "@/utils/utils";

// Casos de estudio MDX de piezas publicadas por Partners.
// Un archivo por pieza en src/content/portfolio/<username>/<slug>.mdx,
// donde <slug> es el título de la pieza slugificado.
const CONTENT_ROOT = ["src", "content", "portfolio"];

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function partnerDir(username: string) {
  return path.join(process.cwd(), ...CONTENT_ROOT, username);
}

export function caseStudyHref(username: string, title: string): string | undefined {
  const slug = slugifyTitle(title);
  const file = path.join(partnerDir(username), `${slug}.mdx`);
  return fs.existsSync(file) ? `/${username}/proyecto/${slug}` : undefined;
}

export function getCaseStudy(username: string, slug: string) {
  if (!fs.existsSync(partnerDir(username))) return null;
  return getPosts([...CONTENT_ROOT, username]).find((post) => post.slug === slug) ?? null;
}
