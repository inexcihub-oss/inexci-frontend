import { useQuery } from "@tanstack/react-query";
import { clinicService } from "@/services/clinic.service";

/** Cadastro estável: muda pouco, cacheado por 20min entre navegações. */
export const CLINICS_QUERY_KEY = ["clinics"] as const;
const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;

export function useClinics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLINICS_QUERY_KEY,
    queryFn: () => clinicService.getAll(),
    staleTime: REGISTRY_STALE_TIME_MS,
    gcTime: 1000 * 60 * 30,
    enabled: options?.enabled,
  });
}
