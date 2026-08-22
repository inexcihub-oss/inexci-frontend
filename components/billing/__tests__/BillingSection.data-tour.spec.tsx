import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SubscriptionDetail } from "@/types";

/**
 * Prova que a aba de plano carrega as âncoras `data-tour` que a trilha
 * `plano-e-cota` (`lib/onboarding/tour-registry.ts`) espera encontrar:
 * "plano-assinatura", "plano-cota" e "plano-acoes". Sem este teste, remover o
 * atributo (ou trocar o elemento) quebra o tour em silêncio.
 */

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: vi.fn().mockResolvedValue([]),
  },
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
});
