import { useQuery } from "@tanstack/react-query";
import { supplierService } from "@/services/supplier.service";

/** Cadastro estável (P5/§8): muda pouco, cacheado por 20min entre navegações. */
export const SUPPLIERS_QUERY_KEY = ["suppliers"] as const;
const REGISTRY_STALE_TIME_MS = 1000 * 60 * 20;

export function useSuppliers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: () => supplierService.getAll(),
    staleTime: REGISTRY_STALE_TIME_MS,
    gcTime: 1000 * 60 * 30,
    enabled: options?.enabled,
  });
}
