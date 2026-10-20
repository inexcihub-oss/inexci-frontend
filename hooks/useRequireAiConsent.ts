"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consentService } from "@/services/consent.service";

interface UseRequireAiConsentResult {
  canUseAi: boolean;
  loading: boolean;
  requestConsent: (options?: {
    inline?: boolean;
  }) => Promise<{ accepted: boolean }>;
}

export function useRequireAiConsent(): UseRequireAiConsentResult {
  const { consents, refreshConsents } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canUseAi = Boolean(consents?.aiConsentAcceptedAt);

  const requestConsent = useCallback(
    async ({ inline = false }: { inline?: boolean } = {}) => {
      if (canUseAi) return { accepted: true };

      if (!inline) {
        router.push("/configuracoes/privacidade");
        return { accepted: false };
      }

      setLoading(true);
      try {
        await consentService.grantAi();
        await refreshConsents();
        return { accepted: true };
      } catch {
        return { accepted: false };
      } finally {
        setLoading(false);
      }
    },
    [canUseAi, refreshConsents, router],
  );

  return { canUseAi, loading, requestConsent };
}
