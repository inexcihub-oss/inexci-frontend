"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { consentService } from "@/services/consent.service";

interface UseRequireAiConsentResult {
  /** Indica se o usuário aceitou a versão vigente do termo de IA. */
  canUseAi: boolean;
  /** Indica se a verificação ainda está em andamento. */
  loading: boolean;
  /**
   * Direciona o usuário ao fluxo de aceite. Se `inline` for `true`, registra
   * o aceite imediatamente para a versão vigente; caso contrário, navega
   * para a página `/configuracoes/privacidade`.
   */
  requestConsent: (options?: {
    inline?: boolean;
  }) => Promise<{ accepted: boolean }>;
  /** Versão atual do termo de IA (quando conhecida). */
  currentVersion: string | null;
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

  const aiStatus = useMemo(
    () => consents.find((c) => c.type === "ai") ?? null,
    [consents],
  );

  const canUseAi = !!aiStatus?.isAccepted;
  const currentVersion = aiStatus?.currentVersion ?? null;

  const requestConsent = useCallback(
    async ({ inline = false }: { inline?: boolean } = {}) => {
      if (canUseAi) return { accepted: true };
      if (!aiStatus) {
        router.push("/configuracoes/privacidade");
        return { accepted: false };
      }

      if (!inline) {
        router.push("/configuracoes/privacidade");
        return { accepted: false };
      }

      setLoading(true);
      try {
        await consentService.grant("ai", aiStatus.currentVersion);
        await refreshConsents();
        return { accepted: true };
      } catch {
        return { accepted: false };
      } finally {
        setLoading(false);
      }
    },
    [aiStatus, canUseAi, refreshConsents, router],
  );

  return { canUseAi, loading, requestConsent, currentVersion };
}
