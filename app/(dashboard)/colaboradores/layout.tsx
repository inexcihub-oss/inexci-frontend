"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  hasAnyArea,
  permissionForRoute,
  resolveHome,
  routeRequiresAnyArea,
} from "@/lib/permissions";

export default function ColaboradoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { can, permissions, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const exigida = permissionForRoute(pathname);
  const liberado = routeRequiresAnyArea(pathname)
    ? hasAnyArea(permissions)
    : !exigida || can(exigida);

  useEffect(() => {
    if (!loading && !liberado) {
      router.replace(resolveHome(permissions));
    }
  }, [liberado, permissions, loading, router]);

  if (loading || !liberado) {
    return null;
  }

  return <>{children}</>;
}
