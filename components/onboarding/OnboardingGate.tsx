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
  const { state, activeTour, closeTour } = useOnboarding();

  const statusAssinatura = subscription?.subscription.status;
  const contaBloqueada =
    isAccountOwner &&
    (statusAssinatura === "canceled" || statusAssinatura === "suspended");

  const silenciado =
    contaBloqueada || (consents ? !consents.requiredConsentsAccepted : true);

  /**
   * O modal NÃO depende de `tracks.length > 0`. Um colaborador recém-criado
   * (`permissions: []`, sem `doctor_profile`) tem `tracks = []` e precisa ver
   * o modal mesmo assim (spec §2.2) — é o slide 3 do `WelcomeModal` que cobre
   * esse caso ("Assim que o administrador da conta liberar suas áreas…").
   * `tracks.length > 0` continua sendo a condição do CARD, já aplicada em
   * `OnboardingProvider.isChecklistVisible` e no próprio guard do card.
   */
  const mostrarBoasVindas = !silenciado && !state.welcomeSeenAt;

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
