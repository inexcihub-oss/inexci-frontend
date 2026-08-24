"use client";

import { useEffect, useRef } from "react";
import { useOnboarding } from "./OnboardingProvider";

/**
 * Registra uma ação que o tour pode acionar por id (`TourStep.acao`) — o
 * mesmo papel que `data-tour` cumpre para alvos visuais, mas para funções
 * (abrir um modal, trocar um estado interno). `fn` pode mudar a cada render
 * sem reregistrar: só a IDENTIDADE de `id` dispara o efeito.
 */
export function useOnboardingAction(id: string, fn: () => void): void {
  const { registrarAcao, desregistrarAcao } = useOnboarding();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    registrarAcao(id, () => fnRef.current());
    return () => desregistrarAcao(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, registrarAcao, desregistrarAcao]);
}
