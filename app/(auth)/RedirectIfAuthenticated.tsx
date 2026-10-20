"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveHome } from "@/lib/permissions";
import { hasStoredSession } from "@/lib/session-storage";

const ALLOWED_WHILE_AUTHENTICATED = ["/confirmar-email"];

export function RedirectIfAuthenticated({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, permissions } = useAuth();
  const pathname = usePathname();
  const [hasSessionHint, setHasSessionHint] = useState(false);

  const isExempt = ALLOWED_WHILE_AUTHENTICATED.some((p) =>
    pathname?.startsWith(p),
  );

  useEffect(() => {
    setHasSessionHint(hasStoredSession());
  }, []);

  useEffect(() => {
    if (loading || isExempt) return;
    if (isAuthenticated && typeof window !== "undefined") {
      window.location.replace(resolveHome(permissions));
    }
  }, [isAuthenticated, loading, isExempt, permissions]);

  if (isExempt) return <>{children}</>;

  if (isAuthenticated) return null;

  if (loading && hasSessionHint) return null;

  return <>{children}</>;
}
