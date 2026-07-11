import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessagesInbox } from "@/components/messages/MessagesInbox";

// Inbox Light: hilos de mensajería directa 1-a-1 fuera de proyectos
// colaborativos. Ver src/app/actions/directMessages.ts y chat-requirements.md
// sección 4.1.
export default async function MessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <MessagesInbox viewerId={userId} />;
}
