"use client";

import { useEffect, useRef } from "react";
import { useOnboarding } from "./OnboardingProvider";

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
