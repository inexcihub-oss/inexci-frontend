import { manufacturerService } from "@/services/manufacturer.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery } from "./createRegistryQuery";

export const MANUFACTURERS_QUERY_KEY = registryKeys.manufacturers();

export const useManufacturers = createRegistryQuery(
  MANUFACTURERS_QUERY_KEY,
  () => manufacturerService.getAll(),
);
