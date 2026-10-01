import { useQuery } from "@tanstack/react-query";
import { clinicService } from "@/services/clinic.service";

export const clinicRoomsQueryKey = (clinicId: string) =>
  ["clinics", clinicId, "rooms"] as const;

/** Salas de uma clínica. Sem clínica escolhida, não busca nada. */
export function useClinicRooms(clinicId: string | null | undefined) {
  return useQuery({
    queryKey: clinicRoomsQueryKey(clinicId ?? ""),
    queryFn: () => clinicService.listRooms(clinicId!),
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 20,
  });
}
