"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveHome } from "@/lib/permissions";
import type { TrackId } from "@/lib/onboarding/state";
import { OnboardingCelebration } from "./OnboardingCelebration";
import { useOnboarding } from "./OnboardingProvider";
import { TourOverlay } from "./TourOverlay";
import { WelcomeModal } from "./WelcomeModal";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { consents, isAccountOwner, subscription, permissions } = useAuth();
  const { state, tracks, activeTour, closeTour, startTour } = useOnboarding();
  const router = useRouter();

  const statusAnteriorRef = useRef(state.status);
  const [celebrando, setCelebrando] = useState(false);
  useEffect(() => {
    if (statusAnteriorRef.current !== "completed" && state.status === "completed") {
      setCelebrando(true);
      router.push(resolveHome(permissions ?? []));
    }
    statusAnteriorRef.current = state.status;
  }, [state.status, router, permissions]);

  const statusAssinatura = subscription?.subscription.status;
  const contaBloqueada =
    isAccountOwner &&
    (statusAssinatura === "canceled" || statusAssinatura === "suspended");

  const silenciado =
    contaBloqueada || (consents ? !consents.requiredConsentsAccepted : true);

  const mostrarBoasVindas = !silenciado && !state.welcomeSeenAt;

  return (
    <>
      {children}
      {mostrarBoasVindas && (
        <WelcomeModal
          onFinish={() => {
            const proxima = tracks.find(
              (track) => !state.completedSteps[track.stepKey],
            );
            if (proxima) startTour(proxima.id);
          }}
          onSkip={() => undefined}
        />
      )}
      {!silenciado && activeTour && (
        <TourOverlay
          key={activeTour}
          trackId={activeTour as TrackId}
          onClose={(opts) => closeTour(opts)}
        />
      )}
      {celebrando && (
        <OnboardingCelebration onDone={() => setCelebrando(false)} />
      )}
    </>
  );
}
