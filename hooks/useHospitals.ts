import { hospitalService } from "@/services/hospital.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery, findRegistryItem } from "./createRegistryQuery";

export const HOSPITALS_QUERY_KEY = registryKeys.hospitals();

export const useHospitals = createRegistryQuery(HOSPITALS_QUERY_KEY, () =>
  hospitalService.getAll(),
);

export function useHospital(id: string | null | undefined) {
  const query = useHospitals({ enabled: !!id });
  return { ...query, hospital: findRegistryItem(query.data, id) };
}
