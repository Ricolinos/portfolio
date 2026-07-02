import { auth, currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  let role = user?.publicMetadata?.role as string | undefined;

  if (!role) {
    const unsafeRole = user?.unsafeMetadata?.role as string | undefined;
    if (unsafeRole === "client" || unsafeRole === "collaborator") {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { role: unsafeRole },
      });
      role = unsafeRole;
    }
  }

  if (role === "client") redirect("/dashboard/client");
  if (role === "collaborator") redirect("/dashboard/collaborator");

  // Sin rol asignado (típico de un registro vía Google/Apple/Facebook, que
  // se salta el paso de selección de rol del formulario de registro).
  redirect("/complete-profile");
}
