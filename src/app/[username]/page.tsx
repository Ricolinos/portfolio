import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ProfileView } from "@/components/profile/ProfileView";
import { ClientProfileView } from "@/components/profile/ClientProfileView";
import { getOrCreateUser } from "@/lib/syncUser";
import { prisma } from "@/lib/prisma";
import { caseStudyHref } from "@/lib/caseStudies";
import { getClientCollabData, getPartnerCollabData } from "@/lib/collab";

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

  // Perfiles de cliente son privados: solo el dueño puede verlos, ni
  // modificando la URL ni de ninguna otra forma. (Compartir con partners
  // específicos queda para una iteración futura.)
  if (role !== "collaborator" && !isOwnProfile) {
    notFound();
  }

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

  // El WhatsApp de un partner solo se revela si él mismo lo activó (opt-in)
  // y quien visita es un usuario logueado de la plataforma; nunca a público
  // anónimo. Al dueño no le hace falta este dato en la vista (edita desde el
  // diálogo de configuración), así que se omite también en su propio perfil.
  const isLoggedIn = Boolean(viewer);
  const canSeeWhatsapp = !isOwnProfile && isLoggedIn && Boolean(profileUser?.shareWhatsapp);

  // Partners (collaborator): showcase estilo Behance con sus proyectos reales.
  if (role === "collaborator") {
    // Los visitantes solo ven piezas públicas; el dueño también sus borradores.
    const rawPieces = ownerId
      ? await prisma.portfolioPiece.findMany({
          where: { userId: ownerId, ...(isOwnProfile ? {} : { isPublic: true }) },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            category: true,
            coverUrl: true,
            views: true,
            likes: true,
            isPublic: true,
            createdAt: true,
            markdownContent: true,
          },
        })
      : [];

    // Enlaza cada pieza a su caso de estudio: MDX en BD (editor propio) o
    // legado en archivo, lo que exista. markdownContent solo se usa aquí
    // para decidir el link — no se manda al cliente (puede pesar mucho).
    const pieces = rawPieces.map(({ markdownContent, ...piece }) => ({
      ...piece,
      coverUrl: piece.coverUrl ?? "",
      createdAt: piece.createdAt.toISOString(),
      href: caseStudyHref(username, piece.title, Boolean(markdownContent)),
    }));

    // Perfil propio del partner: panel de colaboración (solicitudes,
    // proyectos conjuntos, recursos que los clientes le compartieron).
    const partnerCollabData = isOwnProfile && ownerId ? await getPartnerCollabData(ownerId) : null;

    // Viewer ajeno logueado como cliente: se le habilita el botón de
    // contacto y se le informa el estatus de su Connection con este partner,
    // si existe.
    let viewerCanContact = false;
    let viewerConnectionStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null = null;
    if (!isOwnProfile && viewer && ownerId) {
      const viewerUser = await prisma.user.findUnique({ where: { id: viewer.id }, select: { role: true } });
      if (viewerUser?.role === "client") {
        viewerCanContact = true;
        const existingConnection = await prisma.connection.findUnique({
          where: { clientId_partnerId: { clientId: viewer.id, partnerId: ownerId } },
          select: { status: true },
        });
        viewerConnectionStatus = existingConnection?.status ?? null;
      }
    }

    return (
      <ProfileView
        displayName={displayName}
        avatarUrl={avatarUrl}
        isOwnProfile={isOwnProfile}
        username={username}
        whatsapp={canSeeWhatsapp ? profileUser?.whatsapp : undefined}
        email={isOwnProfile ? viewer?.emailAddresses[0]?.emailAddress : undefined}
        memberSince={profileUser?.createdAt.toISOString()}
        isPublic={profileUser?.isPublic ?? true}
        shareWhatsapp={profileUser?.shareWhatsapp ?? false}
        featuredImageUrl={profileUser?.featuredImageUrl}
        cardQuote={profileUser?.cardQuote}
        headline={profileUser?.headline}
        bio={profileUser?.bio}
        projects={projects}
        pieces={pieces}
        partnerId={ownerId}
        pendingRequests={partnerCollabData?.pendingRequests}
        partnerConnections={partnerCollabData?.connections}
        collabProjects={partnerCollabData?.projects}
        sharedResources={partnerCollabData?.sharedResources}
        viewerCanContact={viewerCanContact}
        viewerConnectionStatus={viewerConnectionStatus}
      />
    );
  }

  // Clientes: dashboard con proyectos contratados, diseñadores y recursos.
  // (Este bloque solo corre para isOwnProfile: los perfiles de cliente ajenos
  // ya fueron bloqueados arriba, así que el cliente que llega aquí siempre
  // está logueado como sí mismo.)
  const clientCollabData = ownerId ? await getClientCollabData(ownerId) : null;

  return (
    <ClientProfileView
      displayName={displayName}
      avatarUrl={avatarUrl}
      isOwnProfile={isOwnProfile}
      email={isOwnProfile ? viewer?.emailAddresses[0]?.emailAddress : undefined}
      firstName={isOwnProfile ? viewer?.firstName : undefined}
      lastName={isOwnProfile ? viewer?.lastName : undefined}
      username={isOwnProfile ? viewer?.username : undefined}
      whatsapp={isOwnProfile ? profileUser?.whatsapp : undefined}
      secondaryEmail={isOwnProfile ? profileUser?.secondaryEmail : undefined}
      address={isOwnProfile ? profileUser?.address : undefined}
      company={profileUser?.company}
      brand={profileUser?.brand}
      motto={profileUser?.motto}
      contactPreference={isOwnProfile ? profileUser?.contactPreference : undefined}
      contactHours={isOwnProfile ? profileUser?.contactHours : undefined}
      website={profileUser?.website}
      industry={profileUser?.industry}
      projects={projects}
      connections={clientCollabData?.connections}
      collabProjects={clientCollabData?.projects}
      resources={clientCollabData?.resources}
    />
  );
}
