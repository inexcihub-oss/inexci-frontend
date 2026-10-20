"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  hasAnyArea,
  permissionForRoute,
  resolveHome,
  routeRequiresAnyArea,
} from "@/lib/permissions";

export function PermissionRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { permissions, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const exigida = permissionForRoute(pathname);
  const liberado = routeRequiresAnyArea(pathname)
    ? hasAnyArea(permissions)
    : !exigida || permissions.includes(exigida);

  useEffect(() => {
    if (loading) return;
    if (!liberado) router.replace(resolveHome(permissions));
  }, [loading, liberado, permissions, router]);

  if (loading || !liberado) return null;

  return <>{children}</>;
}
