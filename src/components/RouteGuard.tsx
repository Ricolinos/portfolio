"use client";

import { usePathname } from "next/navigation";
import { routes } from "@/resources";
import NotFound from "@/app/not-found";

interface RouteGuardProps {
  children: React.ReactNode;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();

  const isRouteEnabled = () => {
    if (!pathname) return false;

    const alwaysAllowed = ["/sign-in", "/sign-up", "/dashboard"];
    if (alwaysAllowed.some((p) => pathname.startsWith(p))) return true;

    if (pathname in routes) {
      return routes[pathname as keyof typeof routes];
    }

    const dynamicRoutes = ["/blog", "/work"] as const;
    for (const route of dynamicRoutes) {
      if (pathname.startsWith(route) && routes[route]) {
        return true;
      }
    }

    return false;
  };

  if (!isRouteEnabled()) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export { RouteGuard };
