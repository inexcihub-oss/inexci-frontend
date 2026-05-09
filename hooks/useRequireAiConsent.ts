"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consentService } from "@/services/consent.service";

interface UseRequireAiConsentResult {
  /** Indica se o usuário já aceitou o termo de IA. */
  canUseAi: boolean;
  /** Indica se a verificação ainda está em andamento. */
  loading: boolean;
  /**
   * Direciona o usuário ao fluxo de aceite. Se `inline` for `true`, registra
   * o aceite imediatamente; caso contrário, navega para `/configuracoes/privacidade`.
   */
  requestConsent: (options?: {
    inline?: boolean;
  }) => Promise<{ accepted: boolean }>;
}

/**
 * Hook utilitário para componentes que oferecem ações via assistente de IA.
 *
 * Exemplo:
 * ```tsx
 * const { canUseAi, requestConsent } = useRequireAiConsent();
 * if (!canUseAi) return <Button onClick={() => requestConsent()}>Ativar IA</Button>;
 * ```
 */
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
