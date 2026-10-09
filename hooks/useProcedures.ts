import { useQuery } from "@tanstack/react-query";
import { procedureService } from "@/services/procedure.service";

export const PROCEDURES_QUERY_KEY = ["procedures"] as const;
const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;

export function useProcedures(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: PROCEDURES_QUERY_KEY,
    queryFn: () => procedureService.getAll(),
    staleTime: REGISTRY_STALE_TIME_MS,
    gcTime: 1000 * 60 * 30,
    enabled: options?.enabled,
  });
}
