import { useQuery } from "@tanstack/react-query";
import { availableDoctorsService } from "@/services/available-doctors.service";

export function useAvailableDoctors() {
  return useQuery({
    queryKey: ["available-doctors"],
    queryFn: () => availableDoctorsService.getAvailableDoctors(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
