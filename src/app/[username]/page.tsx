import { currentUser } from "@clerk/nextjs/server";
import { ProfileView } from "@/components/profile/ProfileView";
import { getOrCreateUser } from "@/lib/syncUser";

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  await getOrCreateUser();
  const viewer = await currentUser();

  const isOwnProfile = viewer?.username === username;
  const displayName = isOwnProfile
    ? [viewer?.firstName, viewer?.lastName].filter(Boolean).join(" ") || username
    : username;
  const avatarUrl = isOwnProfile ? viewer?.imageUrl : undefined;

  return (
    <ProfileView displayName={displayName} avatarUrl={avatarUrl} isOwnProfile={isOwnProfile} />
  );
}
