import { prisma } from "@/lib/prisma";
import type { Shout } from "@/components/explore/ExploreFeed";
import { caseStudyHref } from "@/lib/caseStudies";

// Feed de piezas de portafolio con su autor: alimenta HomeShowcase y ExploreFeed.
// Solo piezas públicas: los borradores viven únicamente en el perfil del dueño.
export async function getPortfolioFeed() {
  return prisma.portfolioPiece.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, username: true, imageUrl: true } },
    },
  });
}

export function toShouts(feed: Awaited<ReturnType<typeof getPortfolioFeed>>): Shout[] {
  return feed.map((piece) => ({
    id: piece.id,
    author: piece.user.name ?? piece.user.username ?? "Partner",
    avatar: piece.user.imageUrl,
    category: piece.category,
    description: piece.description ?? piece.title,
    image: piece.coverUrl ?? "",
    likes: piece.likes,
    href: piece.user.username ? caseStudyHref(piece.user.username, piece.title) : undefined,
  }));
}
