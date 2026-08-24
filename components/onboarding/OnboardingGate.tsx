"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { TrackId } from "@/lib/onboarding/state";
import { OnboardingCelebration } from "./OnboardingCelebration";
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

  /**
   * Celebração de conclusão total — dispara só na transição PARA "completed"
   * NESTA sessão (mesmo raciocínio do "tudo pronto" de sessão em
   * `OnboardingProvider.isChecklistVisible`): um `status: "completed"" que já
   * chega pronto do servidor (próximo login) não deveria reabrir os
   * confetes toda vez que a página carrega.
   */
  const statusAnteriorRef = useRef(state.status);
  const [celebrando, setCelebrando] = useState(false);
  useEffect(() => {
    if (statusAnteriorRef.current !== "completed" && state.status === "completed") {
      setCelebrando(true);
    }
    statusAnteriorRef.current = state.status;
  }, [state.status]);

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
        // `key={activeTour}` força a remontagem ao trocar de trilha — desde
        // que o motor passou a avançar sozinho para a próxima trilha
        // incompleta (`OnboardingProvider.closeTour`), sem isso o índice de
        // passo interno do `TourOverlay` ficaria parado no valor da trilha
        // anterior em vez de recomeçar do passo 1.
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
