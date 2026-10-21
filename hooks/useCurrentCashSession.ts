"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";

export function useCurrentCashSession({ enabled = true } = {}) {
  return useQuery({
    queryKey: financeKeys.currentCashSession(),
    queryFn: () => financeService.getCurrentCashSession(),
    enabled,
  });
}
