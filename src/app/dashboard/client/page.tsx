import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Button, Column, Feedback, Heading, Row, Text } from "@once-ui-system/core";
import { prisma } from "@/lib/prisma";
import { getClientCollabData } from "@/lib/collab";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ProjectListWidget } from "@/components/dashboard/ProjectListWidget";

export default async function ClientDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  if (user?.publicMetadata?.role === "collaborator") redirect("/dashboard/collaborator");

  const [{ username }, { connections, projects }] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { username: true } }),
    getClientCollabData(userId),
  ]);

  const activeProjects = projects.filter((project) => project.status === "active");
  const finishedProjects = projects.filter((project) => project.status !== "active");
  const tasksToApprove = projects.reduce(
    (total, project) => total + project.tasks.filter((task) => task.status === "in_review").length,
    0,
  );
  const pendingConnections = connections.filter((connection) => connection.status === "PENDING");

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Panel de cliente</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Resumen de tus proyectos conjuntos con tus partners.
        </Text>
      </Column>

      {pendingConnections.map((connection) => (
        <Feedback
          key={connection.id}
          variant="info"
          fillWidth
          description={`Esperando respuesta de ${connection.partner.name ?? connection.partner.username ?? "el partner"}.`}
        />
      ))}

      <DashboardMetrics
        metrics={[
          { label: "Proyectos activos", value: activeProjects.length, icon: "briefcase" },
          { label: "Proyectos finalizados", value: finishedProjects.length, icon: "check" },
          { label: "Tareas por aprobar", value: tasksToApprove, icon: "sparkles" },
        ]}
      />

      <Row gap="12" wrap>
        {username && (
          <>
            <Button variant="primary" size="m" prefixIcon="plus" href={`/${username}`}>
              Crear nuevo proyecto
            </Button>
            <Button variant="secondary" size="m" prefixIcon="folder" href={`/${username}`}>
              Mis recursos
            </Button>
          </>
        )}
      </Row>

      <ProjectListWidget
        title="Proyectos en curso"
        projects={activeProjects}
        emptyMessage="Aún no tienes proyectos activos."
        limit={5}
      />

      <ProjectListWidget
        title="Proyectos finalizados"
        projects={finishedProjects}
        emptyMessage="Todavía no tienes proyectos finalizados."
        limit={5}
      />
    </Column>
  );
}
