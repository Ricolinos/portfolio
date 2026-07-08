import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getPosts } from "@/utils/utils";
import { prisma } from "@/lib/prisma";

// Casos de estudio MDX de piezas publicadas por Partners. Dos orígenes:
// - BD (PortfolioPiece.caseStudy): creados desde el panel del perfil.
// - Archivo en src/content/portfolio/<username>/<slug>.mdx: piezas antiguas,
//   donde <slug> es el título de la pieza slugificado.
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

export async function getCaseStudy(username: string, slug: string) {
  const piece = await prisma.portfolioPiece.findFirst({
    where: { slug, caseStudy: { not: null }, user: { username } },
    select: { caseStudy: true, isPublic: true },
  });

  if (piece?.caseStudy) {
    const { data, content } = matter(piece.caseStudy);
    return {
      slug,
      content,
      isPublic: piece.isPublic,
      metadata: {
        title: (data.title as string) ?? "",
        publishedAt: (data.publishedAt as string) ?? "",
        summary: (data.summary as string) ?? "",
        images: (data.images as string[]) ?? [],
        tag: (data.tag as string) ?? "",
        image: "",
      },
    };
  }

  if (!fs.existsSync(partnerDir(username))) return null;
  const post = getPosts([...CONTENT_ROOT, username]).find((p) => p.slug === slug);
  return post ? { ...post, isPublic: true } : null;
}
