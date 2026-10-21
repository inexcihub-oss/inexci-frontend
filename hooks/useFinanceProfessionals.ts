"use client";

import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";

export function useFinanceProfessionals() {
  return useQuery({
    queryKey: financeKeys.professionals(),
    queryFn: () => financeService.listProfessionals(),
  });
}
