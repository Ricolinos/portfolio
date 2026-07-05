import type { ReactNode } from "react";
import { getOrCreateUser } from "@/lib/syncUser";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await getOrCreateUser();
  return <>{children}</>;
}
