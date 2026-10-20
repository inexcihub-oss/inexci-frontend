import { supplierService } from "@/services/supplier.service";
import { registryKeys } from "@/lib/query-keys/registry";
import { createRegistryQuery } from "./createRegistryQuery";

export const SUPPLIERS_QUERY_KEY = registryKeys.suppliers();

export const useSuppliers = createRegistryQuery(SUPPLIERS_QUERY_KEY, () =>
  supplierService.getAll(),
);
