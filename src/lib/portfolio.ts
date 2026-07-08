import { prisma } from "@/lib/prisma";
import type { Shout } from "@/components/explore/ExploreFeed";

// Feed de piezas de portafolio con su autor: alimenta HomeShowcase y ExploreFeed.
export async function getPortfolioFeed() {
  return prisma.portfolioPiece.findMany({
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
    image: piece.coverUrl,
    likes: piece.likes,
  }));
}
