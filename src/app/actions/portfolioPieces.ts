"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Cambia la visibilidad de una pieza (público ↔ borrador).
// Solo el dueño de la pieza puede modificarla.
export async function setPieceVisibility(pieceId: string, isPublic: boolean): Promise<void> {
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const piece = await prisma.portfolioPiece.findUnique({
    where: { id: pieceId },
    select: { userId: true, user: { select: { username: true } } },
  });
  if (!piece || piece.userId !== userId) throw new Error("No autorizado");

  await prisma.portfolioPiece.update({
    where: { id: pieceId },
    data: { isPublic },
  });

  // Los borradores desaparecen de perfil público, Explorar y Home.
  if (piece.user.username) revalidatePath(`/${piece.user.username}`);
  revalidatePath("/explorar");
  revalidatePath("/");
}
