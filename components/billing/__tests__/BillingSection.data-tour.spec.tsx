import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SubscriptionDetail, SubscriptionPlan } from "@/types";

/**
 * Prova que a aba de plano carrega as âncoras `data-tour` que a trilha
 * `plano-e-cota` (`lib/onboarding/tour-registry.ts`) espera encontrar:
 * "plano-assinatura", "plano-cota", "plano-acoes" e (dentro do modal de
 * seleção) "plano-planos-disponiveis". Sem este teste, remover o atributo
 * (ou trocar o elemento) quebra o tour em silêncio.
 */

function planoFake(): SubscriptionPlan {
  return {
    id: "plan-1",
    slug: "profissional",
    name: "Profissional",
    description: null,
    priceCents: 19900,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: 50,
    sortOrder: 1,
    isTrialDefault: false,
  };
}

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: vi.fn().mockResolvedValue([planoFake()]),
  },
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

function assinatura(): SubscriptionDetail {
  return {
    subscription: {
      id: "sub-1",
      status: "active",
      planId: "plan-1",
      trialEndsAt: null,
      currentPeriodStart: "2026-08-01T00:00:00.000Z",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      suspendedAt: null,
      pastDueSince: null,
      gatewayProvider: "stripe",
    },
    plan: null,
    nextPlan: null,
    quota: null,
    daysLeftInTrial: null,
    daysUntilSuspension: null,
  } as SubscriptionDetail;
}

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    subscription: assinatura(),
    subscriptionLoading: false,
    refreshSubscription: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { BillingSection } from "../BillingSection";

describe("BillingSection — âncoras do tour", () => {
  it("expõe as três âncoras plano-assinatura, plano-cota e plano-acoes", async () => {
    render(<BillingSection />);

    expect(
      await screen.findByText("Resolver assinatura"),
    ).toBeInTheDocument();

    expect(document.querySelector('[data-tour="plano-assinatura"]')).not
      .toBeNull();
    expect(document.querySelector('[data-tour="plano-cota"]')).not.toBeNull();
    expect(document.querySelector('[data-tour="plano-acoes"]')).not.toBeNull();
  });

  it('expõe data-tour="plano-planos-disponiveis" dentro do modal de troca de plano', async () => {
    render(<BillingSection />);

    const botaoTrocarPlano = await screen.findByText("Trocar plano");
    await userEvent.setup().click(botaoTrocarPlano);

    // PlanSelector monta o carrossel mobile e a grade desktop ao mesmo tempo
    // (alternância é só por CSS), então o nome do plano aparece duas vezes no
    // DOM — mesmo padrão já usado em PlanSelector.spec.tsx.
    expect((await screen.findAllByText("Profissional")).length).toBeGreaterThan(
      0,
    );
    expect(
      document.querySelector('[data-tour="plano-planos-disponiveis"]'),
    ).not.toBeNull();
  });
});
