import { procedureService } from "@/services/procedure.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery } from "./createRegistryQuery";

export const PROCEDURES_QUERY_KEY = registryKeys.procedures();

export const useProcedures = createRegistryQuery(PROCEDURES_QUERY_KEY, () =>
  procedureService.getAll(),
);
