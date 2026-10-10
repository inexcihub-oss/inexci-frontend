import { useQuery } from "@tanstack/react-query";
import { clinicService } from "@/services/clinic.service";
import {
  REGISTRY_STALE_TIME_MS,
  registryKeys,
} from "@/lib/query-keys/registry";

export const clinicRoomsQueryKey = registryKeys.clinicRooms;

export function useClinicRooms(clinicId: string | null | undefined) {
  return useQuery({
    queryKey: clinicRoomsQueryKey(clinicId ?? ""),
    queryFn: () => clinicService.listRooms(clinicId!),
    enabled: !!clinicId,
    staleTime: REGISTRY_STALE_TIME_MS,
  });
}
