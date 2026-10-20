"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ConsentOnboardingModal } from "./ConsentOnboardingModal";

const ALLOWED_PATH_PREFIXES = ["/configuracoes/privacidade", "/privacidade"];

interface ConsentGateProps {
  children: React.ReactNode;
}

export function ConsentGate({ children }: ConsentGateProps) {
  const { user, consents, refreshConsents } = useAuth();
  const pathname = usePathname() ?? "";

  const blocking = useMemo(() => {
    if (!user || !consents) return false;
    return !consents.requiredConsentsAccepted;
  }, [user, consents]);

  const isAllowedPath = ALLOWED_PATH_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (blocking && !isAllowedPath && consents) {
    return (
      <ConsentOnboardingModal
        consents={consents}
        onCompleted={refreshConsents}
      />
    );
  }

  return <>{children}</>;
}
