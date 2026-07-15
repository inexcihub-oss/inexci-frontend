import { useQuery } from "@tanstack/react-query";
import { healthPlanService } from "@/services/health-plan.service";

/** Cadastro estável (P5/§8): muda pouco, cacheado por 20min entre navegações. */
export const HEALTH_PLANS_QUERY_KEY = ["health-plans"] as const;
const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;

export function useHealthPlans(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: HEALTH_PLANS_QUERY_KEY,
    queryFn: () => healthPlanService.getAll(),
    staleTime: REGISTRY_STALE_TIME_MS,
    gcTime: 1000 * 60 * 30,
    enabled: options?.enabled,
  });
}
