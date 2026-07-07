import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import CollaboratorProjects, { type CollaboratorProjectItem } from "./CollaboratorProjects";

export default async function CollaboratorDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  if (user?.publicMetadata?.role !== "collaborator") redirect("/dashboard");

  // El partner ve TODOS los proyectos de todos los clientes.
  const quotes = await prisma.projectQuote.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { updatedAt: "desc" },
  });

  // Serialización de la frontera server→client: Decimal→number, Date→ISO.
  const items: CollaboratorProjectItem[] = quotes.map((quote) => ({
    id: quote.id,
    title: quote.title,
    clientName: quote.clientName,
    ownerName: quote.user.name,
    ownerEmail: quote.user.email,
    status: quote.status,
    currency: quote.currency,
    total: quote.total === null ? null : Number(quote.total),
    updatedAt: quote.updatedAt.toISOString(),
  }));

  return <CollaboratorProjects projects={items} />;
}
