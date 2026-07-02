"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function setUserRole(role: "client" | "collaborator") {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { role },
  });
}
