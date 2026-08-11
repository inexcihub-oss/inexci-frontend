"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { QUOTA_QUERY_KEY } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import type { QuotaStatus } from "@/types";

/**
 * Cota do ciclo corrente da conta.
 *
 * Só busca para quem tem `Permission.SOLICITACOES`: quem só usa Agenda ou
 * Atendimento nunca consome cota, e a rota lhe devolveria 403.
 *
 * `staleTime` curto porque o número muda a cada envio de solicitação — e o
 * `refreshSubscription` do `AuthContext` invalida esta query, então o banner
 * reage no mesmo instante em que a solicitação é enviada.
 */
export function useQuota() {
  const { can, isAuthenticated } = useAuth();
  const habilitado = isAuthenticated && can(Permission.SOLICITACOES);

  return useQuery<QuotaStatus | null>({
    queryKey: QUOTA_QUERY_KEY,
    queryFn: () => billingService.getQuota(),
    enabled: habilitado,
    staleTime: 1000 * 60, // 1 minuto
    retry: false,
  });
}
