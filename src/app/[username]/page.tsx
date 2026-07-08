import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ProfileView } from "@/components/profile/ProfileView";
import { ClientProfileView } from "@/components/profile/ClientProfileView";
import { getOrCreateUser } from "@/lib/syncUser";
import { prisma } from "@/lib/prisma";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  await getOrCreateUser();
  const viewer = await currentUser();

  const isOwnProfile = viewer?.username === username;
  const profileUser = await prisma.user.findUnique({ where: { username } });

  // Username sin usuario en BD y que tampoco es el perfil propio del viewer → 404
  if (!profileUser && !isOwnProfile) {
    notFound();
  }

  const displayName = isOwnProfile
    ? [viewer?.firstName, viewer?.lastName].filter(Boolean).join(" ") || username
    : profileUser?.name || username;
  const avatarUrl = isOwnProfile
    ? viewer?.imageUrl
    : profileUser?.imageUrl ?? undefined;

  // Rol del dueño del perfil: BD primero; para perfil propio aún sin fila, metadata de Clerk.
  const viewerRole = viewer?.publicMetadata?.role;
  const role =
    profileUser?.role ??
    (isOwnProfile && (viewerRole === "client" || viewerRole === "collaborator")
      ? viewerRole
      : "client");

  const ownerId = profileUser?.id ?? (isOwnProfile ? viewer?.id : undefined);
  const quotes = ownerId
    ? await prisma.projectQuote.findMany({
        where: { userId: ownerId },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  const projects = quotes.map((quote) => ({
    id: quote.id,
    title: quote.title,
    clientName: quote.clientName,
    status: quote.status,
    currency: quote.currency,
    total: quote.total === null ? null : Number(quote.total),
    updatedAt: quote.updatedAt.toISOString(),
  }));

  // Partners (collaborator): showcase estilo Behance con sus proyectos reales.
  if (role === "collaborator") {
    const pieces = ownerId
      ? await prisma.portfolioPiece.findMany({
          where: { userId: ownerId },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, category: true, coverUrl: true, views: true, likes: true },
        })
      : [];

    return (
      <ProfileView
        displayName={displayName}
        avatarUrl={avatarUrl}
        isOwnProfile={isOwnProfile}
        username={username}
        whatsapp={profileUser?.whatsapp}
        email={isOwnProfile ? viewer?.emailAddresses[0]?.emailAddress : undefined}
        memberSince={profileUser?.createdAt.toISOString()}
        projects={projects}
        pieces={pieces}
      />
    );
  }

  // Clientes: dashboard con proyectos contratados, diseñadores y recursos.
  const designers = await prisma.user.findMany({
    where: { role: "collaborator" },
    select: { username: true, name: true, imageUrl: true, whatsapp: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <ClientProfileView
      displayName={displayName}
      avatarUrl={avatarUrl}
      isOwnProfile={isOwnProfile}
      email={isOwnProfile ? viewer?.emailAddresses[0]?.emailAddress : undefined}
      whatsapp={isOwnProfile ? profileUser?.whatsapp : undefined}
      projects={projects}
      designers={designers}
    />
  );
}
