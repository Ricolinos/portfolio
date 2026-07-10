import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Button, Column, Heading, Row, Text } from "@once-ui-system/core";
import { getOrCreateUser } from "@/lib/syncUser";
import { getPartnerCollabData } from "@/lib/collab";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ProjectListWidget } from "@/components/dashboard/ProjectListWidget";
import { PendingRequestsWidget } from "@/components/dashboard/PendingRequestsWidget";

export default async function CollaboratorDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  if (user?.publicMetadata?.role !== "collaborator") redirect("/dashboard");

  // getOrCreateUser (no findUniqueOrThrow): el layout siembra el User en
  // paralelo, sin garantía de orden frente al render de esta page (Next no
  // secuencia layout antes que page) — llamarlo aquí también evita la
  // condición de carrera para altas nuevas (p. ej. login con Google).
  const [dbUser, { pendingRequests, projects }] = await Promise.all([
    getOrCreateUser(),
    getPartnerCollabData(userId),
  ]);
  const username = dbUser?.username ?? null;

  const activeProjects = projects.filter((project) => project.status === "active");
  const finishedProjects = projects.filter((project) => project.status !== "active");
  const pendingTasks = projects.reduce(
    (total, project) => total + project.tasks.filter((task) => task.status === "pending").length,
    0,
  );

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Panel de partner</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Resumen de tus proyectos conjuntos con tus clientes.
        </Text>
      </Column>

      <DashboardMetrics
        metrics={[
          { label: "Proyectos activos", value: activeProjects.length, icon: "briefcase" },
          { label: "Proyectos finalizados", value: finishedProjects.length, icon: "check" },
          { label: "Solicitudes pendientes", value: pendingRequests.length, icon: "person" },
          { label: "Tareas pendientes", value: pendingTasks, icon: "sparkles" },
        ]}
      />

      <Row gap="12" wrap>
        {username && (
          <Button variant="primary" size="m" prefixIcon="plus" href={`/${username}`}>
            Agregar proyecto
          </Button>
        )}
      </Row>

      {pendingRequests.length > 0 && <PendingRequestsWidget requests={pendingRequests} />}

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
