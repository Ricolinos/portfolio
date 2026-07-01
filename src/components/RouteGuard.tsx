"use client";

import { usePathname, notFound } from "next/navigation";
import { routes } from "@/resources";

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();

  const isRouteEnabled = () => {
    if (!pathname) return false;

    const alwaysAllowed = ["/sign-in", "/sign-up", "/dashboard"];
    if (alwaysAllowed.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;

    if (pathname in routes) {
      return routes[pathname as keyof typeof routes];
    }

    const dynamicRoutes = ["/blog", "/work", "/explorar", "/recursos", "/servicios"] as const;
    for (const route of dynamicRoutes) {
      if (pathname.startsWith(route) && routes[route]) {
        return true;
      }
    }

    return false;
  };

  if (!isRouteEnabled()) {
    notFound();
  }

  return <>{children}</>;
};

export { RouteGuard };
