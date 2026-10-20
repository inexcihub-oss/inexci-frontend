import { healthPlanService } from "@/services/health-plan.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery, findRegistryItem } from "./createRegistryQuery";

export const HEALTH_PLANS_QUERY_KEY = registryKeys.healthPlans();

export const useHealthPlans = createRegistryQuery(HEALTH_PLANS_QUERY_KEY, () =>
  healthPlanService.getAll(),
);

export function useHealthPlan(id: string | null | undefined) {
  const query = useHealthPlans({ enabled: !!id });
  return { ...query, healthPlan: findRegistryItem(query.data, id) };
}
