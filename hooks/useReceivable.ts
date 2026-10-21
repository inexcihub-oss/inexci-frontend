"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";

export function useReceivable(id: string | null | undefined) {
  return useQuery({
    queryKey: financeKeys.receivable(id ?? ""),
    queryFn: () => financeService.getReceivable(id as string),
    enabled: !!id,
  });
}
