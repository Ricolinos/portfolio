import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Column, Heading, Text } from "@once-ui-system/core";
import { getPartnerCollabData } from "@/lib/collab";
import { ProjectListWidget } from "@/components/dashboard/ProjectListWidget";

export default async function CollaboratorActiveProjectsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await currentUser();
  if (user?.publicMetadata?.role !== "collaborator") redirect("/dashboard");

  const { projects } = await getPartnerCollabData(userId);
  const activeProjects = projects.filter((project) => project.status === "active");

  return (
    <Column fillWidth paddingY="80" paddingX="24" gap="24" maxWidth="l" horizontal="center">
      <Column gap="4" fillWidth>
        <Heading variant="heading-strong-l">Proyectos en curso</Heading>
        <Text onBackground="neutral-weak" variant="body-default-m">
          Todos tus proyectos conjuntos activos.
        </Text>
      </Column>

      <ProjectListWidget
        projects={activeProjects}
        emptyMessage="Aún no tienes proyectos activos."
      />
    </Column>
  );
}
