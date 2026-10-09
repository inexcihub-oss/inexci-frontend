import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { availableDoctorsService } from "@/services/available-doctors.service";

export const AVAILABLE_DOCTORS_QUERY_KEY = ["available-doctors"] as const;

export function useAvailableDoctors({ fresh = false } = {}) {
  return useQuery({
    queryKey: AVAILABLE_DOCTORS_QUERY_KEY,
    queryFn: () => availableDoctorsService.getAvailableDoctors(),
    staleTime: fresh ? 0 : 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useInvalidateAvailableDoctors() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: AVAILABLE_DOCTORS_QUERY_KEY }),
    [queryClient],
  );
}
