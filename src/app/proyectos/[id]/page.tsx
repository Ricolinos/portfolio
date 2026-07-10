import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getCollabProject } from "@/lib/collab";
import { CollabProjectView } from "@/components/collab/CollabProjectView";

interface CollabProjectPageProps {
  params: Promise<{ id: string }>;
}

// Detalle de un proyecto colaborativo cliente↔partner: tareas con flujo de
// aprobación, links de archivos externos y configuración del proyecto. Ver
// src/lib/collab.ts (getCollabProject) y src/app/actions/collab.ts.
export default async function CollabProjectPage({ params }: CollabProjectPageProps) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const project = await getCollabProject(id, userId);
  if (!project) notFound();

  // getCollabProject no proyecta client/partner (solo connectionId): se
  // resuelven aquí para la cabecera y para decidir el rol del viewer.
  const connection = await prisma.connection.findUnique({
    where: { id: project.connectionId },
    select: {
      client: { select: { id: true, username: true, name: true, imageUrl: true } },
      partner: { select: { id: true, username: true, name: true, imageUrl: true } },
    },
  });
  if (!connection) notFound();

  const viewerRole = connection.client.id === userId ? "client" : "partner";

  // Candidatos a agregar como colaborador adicional: partners con Connection
  // ACCEPTED con el mismo cliente, excluyendo al partner fundador y a los
  // que ya sean colaboradores del proyecto.
  const availableConnections = await prisma.connection.findMany({
    where: {
      clientId: connection.client.id,
      status: "ACCEPTED",
      partnerId: { notIn: [connection.partner.id, ...project.collaborators.map((c) => c.id)] },
    },
    include: {
      partner: { select: { id: true, username: true, name: true, imageUrl: true, headline: true } },
    },
  });
  const availablePartners = availableConnections.map((c) => c.partner);

  return (
    <CollabProjectView
      project={project}
      client={connection.client}
      partner={connection.partner}
      viewerRole={viewerRole}
      viewerId={userId}
      availablePartners={availablePartners}
    />
  );
}
