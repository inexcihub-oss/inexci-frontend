"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { QUOTA_QUERY_KEY } from "@/lib/query-keys";
import { billingService } from "@/services/billing.service";
import type { QuotaStatus } from "@/types";

export function useQuota() {
  const { can, isAuthenticated } = useAuth();
  const habilitado = isAuthenticated && can(Permission.SOLICITACOES);

  return useQuery<QuotaStatus | null>({
    queryKey: QUOTA_QUERY_KEY,
    queryFn: () => billingService.getQuota(),
    enabled: habilitado,
    staleTime: 1000 * 60,
    retry: false,
  });
}
