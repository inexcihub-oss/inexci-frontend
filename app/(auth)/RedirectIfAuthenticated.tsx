"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveHome } from "@/lib/permissions";

const ALLOWED_WHILE_AUTHENTICATED = ["/confirmar-email"];

function hasLocalSessionHint(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user");
    if (!raw || raw === "undefined" || raw === "null") return false;
    return !!JSON.parse(raw)?.id;
  } catch {
    return false;
  }
}

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
    setHasSessionHint(hasLocalSessionHint());
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
