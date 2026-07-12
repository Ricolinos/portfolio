import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Column } from "@once-ui-system/core";
import { MessengerView } from "@/components/messages/MessengerView";

// Vista maestra de mensajería (chat-messenger-refactor.md): layout Messenger
// de 3 paneles que unifica hilos directos (DirectThread) y canales de
// proyecto (ProjectChannel) vía src/app/actions/inbox.ts. ?project=<id>
// preselecciona el primer canal de grupo de ese proyecto; ?channel=<id>
// (accesos directos desde el gestor de proyectos) preselecciona esa sala en
// particular dentro del proyecto.
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; channel?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { project, channel } = await searchParams;

  return (
    <Column fillWidth fillHeight>
      <MessengerView viewerId={userId} initialProjectId={project} initialChannelId={channel} />
    </Column>
  );
}
