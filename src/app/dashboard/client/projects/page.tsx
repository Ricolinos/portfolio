import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import ProjectsClient, { type ProjectItem } from "./ProjectsClient";

export default async function ClientProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const quotes = await prisma.projectQuote.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Serializar para la frontera server→client: Decimal → number, Date → ISO string
  const projects: ProjectItem[] = quotes.map((quote) => ({
    id: quote.id,
    title: quote.title,
    clientName: quote.clientName,
    status: quote.status,
    currency: quote.currency,
    total: quote.total === null ? null : Number(quote.total),
    updatedAt: quote.updatedAt.toISOString(),
  }));

  return <ProjectsClient projects={projects} />;
}
