"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { TrackId } from "@/lib/onboarding/state";
import { useOnboarding } from "./OnboardingProvider";
import { TourOverlay } from "./TourOverlay";
import { WelcomeModal } from "./WelcomeModal";

/**
 * Decide o que o onboarding mostra por cima da página.
 *
 * Fica DEPOIS do `ConsentGate` no layout, e cala quando a assinatura do dono
 * está bloqueada. As duas condições são a mesma regra: aceite de LGPD e
 * cobrança vêm antes de qualquer outra coisa, e empilhar o modal de
 * boas-vindas sobre o de consentimento furaria a exigência legal de aceite
 * antes do uso.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { consents, isAccountOwner, subscription } = useAuth();
  const { state, tracks, activeTour, closeTour } = useOnboarding();

  const statusAssinatura = subscription?.subscription.status;
  const contaBloqueada =
    isAccountOwner &&
    (statusAssinatura === "canceled" || statusAssinatura === "suspended");

  const silenciado =
    contaBloqueada || (consents ? !consents.requiredConsentsAccepted : true);

  const mostrarBoasVindas =
    !silenciado && !state.welcomeSeenAt && tracks.length > 0;

  return (
    <>
      {children}
      {mostrarBoasVindas && <WelcomeModal onFinish={() => undefined} />}
      {!silenciado && activeTour && (
        <TourOverlay
          trackId={activeTour as TrackId}
          onClose={(opts) => closeTour(opts)}
        />
      )}
    </>
  );
}
