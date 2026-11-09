import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminAiGroupBy,
  type AdminAiUsageParams,
} from "@/services/admin.service";
import type { AdminPeriodRange } from "@/components/admin/AdminPeriodFilter";

export function useAiUsageRows(
  groupBy: AdminAiGroupBy,
  range: AdminPeriodRange | null,
  filters: { source?: string; ownerId?: string },
  enabled = true,
) {
  const params: AdminAiUsageParams = {
    ...(range ?? {}),
    groupBy,
    ...(filters.source ? { source: filters.source } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
  };
  return useQuery({
    queryKey: adminKeys.aiUsage(params),
    queryFn: () => adminService.getAiUsageReport(params),
    enabled: enabled && range !== null,
    placeholderData: (previous) => previous,
  });
}
