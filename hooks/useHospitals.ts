import { useQuery } from "@tanstack/react-query";
import { hospitalService } from "@/services/hospital.service";

/** Cadastro estável (P5/§8): muda pouco, cacheado por 20min entre navegações. */
export const HOSPITALS_QUERY_KEY = ["hospitals"] as const;
const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;

export function useHospitals(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: HOSPITALS_QUERY_KEY,
    queryFn: () => hospitalService.getAll(),
    staleTime: REGISTRY_STALE_TIME_MS,
    gcTime: 1000 * 60 * 30,
    enabled: options?.enabled,
  });
}
