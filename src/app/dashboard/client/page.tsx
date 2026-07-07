import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import ClientDashboard from "./ClientDashboard";

export default async function ClientDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  if (user?.publicMetadata?.role === "collaborator") redirect("/dashboard/collaborator");

  const [activeProjects, pendingQuotes] = await Promise.all([
    prisma.projectQuote.count({ where: { userId, status: "active" } }),
    prisma.projectQuote.count({ where: { userId, status: "draft" } }),
  ]);

  return <ClientDashboard activeProjects={activeProjects} pendingQuotes={pendingQuotes} />;
}
