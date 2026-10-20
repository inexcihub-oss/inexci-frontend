import { useQuery } from "@tanstack/react-query";
import {
  REGISTRY_GC_TIME_MS,
  REGISTRY_STALE_TIME_MS,
} from "@/lib/query-keys/registry";

export interface RegistryQueryOptions {
  enabled?: boolean;
}

export function createRegistryQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T[]>,
) {
  return function useRegistryQuery(options?: RegistryQueryOptions) {
    return useQuery({
      queryKey,
      queryFn,
      staleTime: REGISTRY_STALE_TIME_MS,
      gcTime: REGISTRY_GC_TIME_MS,
      enabled: options?.enabled,
    });
  };
}

export function findRegistryItem<T extends { id: string | number }>(
  items: T[] | undefined,
  id: string | number | null | undefined,
): T | null {
  if (id === null || id === undefined || id === "") return null;
  return items?.find((item) => String(item.id) === String(id)) ?? null;
}
