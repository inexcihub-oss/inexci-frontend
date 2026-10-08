import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { availableDoctorsService } from "@/services/available-doctors.service";

export const AVAILABLE_DOCTORS_QUERY_KEY = ["available-doctors"] as const;

/**
 * `fresh`: busca de novo a cada montagem e ao voltar o foco para a aba, sem
 * confiar no cache de 5 minutos. Para telas que bloqueiam ação pelo cadastro
 * do médico (ex.: CRM sem número) — quem acabou de corrigir o cadastro em
 * Colaboradores não pode continuar bloqueado pelo dado antigo.
 */
export function useAvailableDoctors({ fresh = false } = {}) {
  return useQuery({
    queryKey: AVAILABLE_DOCTORS_QUERY_KEY,
    queryFn: () => availableDoctorsService.getAvailableDoctors(),
    staleTime: fresh ? 0 : 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Descarta a lista de médicos em cache. Chamar depois de qualquer gravação em
 * Colaboradores que mude quem aparece nela ou com qual conselho (criar,
 * editar conselho/registro, promover, ativar/desativar, excluir) — senão o
 * wizard de SC e a agenda seguem por até 5 minutos com o cadastro antigo.
 */
export function useInvalidateAvailableDoctors() {
  const queryClient = useQueryClient();
  return useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: AVAILABLE_DOCTORS_QUERY_KEY }),
    [queryClient],
  );
}
