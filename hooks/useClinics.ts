import { clinicService } from "@/services/clinic.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery } from "./createRegistryQuery";

export const CLINICS_QUERY_KEY = registryKeys.clinics();

export const useClinics = createRegistryQuery(CLINICS_QUERY_KEY, () =>
  clinicService.getAll(),
);
