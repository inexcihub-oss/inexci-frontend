"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";

export function useFinancialAccounts(
  { includeInactive = false }: { includeInactive?: boolean } = {},
) {
  return useQuery({
    queryKey: financeKeys.accountList(includeInactive),
    queryFn: () => financeService.listAccounts(includeInactive),
  });
}

export function usePaymentMethodConfigs() {
  return useQuery({
    queryKey: financeKeys.paymentMethods(),
    queryFn: () => financeService.listPaymentMethods(),
  });
}
