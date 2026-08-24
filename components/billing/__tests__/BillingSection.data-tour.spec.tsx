import { describe, it, expect, vi, beforeEach } from "vitest";
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
    // Sem preço no gateway o card vira "Enterprise" e não renderiza o CTA
    // que estes testes exercitam.
    gatewayPriceId: "price_profissional_mensal",
    surgeryRequestQuota: 50,
    sortOrder: 1,
    isTrialDefault: false,
  };
}

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: vi.fn().mockResolvedValue([planoFake()]),
    startCheckout: vi.fn().mockResolvedValue({ url: "https://stripe.test/checkout" }),
    openPortal: vi.fn().mockResolvedValue({ url: "https://stripe.test/portal" }),
  },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({
    emTour: onboardingMockState.emTour,
    executarAcao: () => false,
  }),
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

const authMockState = vi.hoisted(() => ({ status: "active" as string }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => {
    const sub = assinatura();
    return {
      subscription: {
        ...sub,
        subscription: { ...sub.subscription, status: authMockState.status },
      },
      subscriptionLoading: false,
      refreshSubscription: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

import { BillingSection } from "../BillingSection";
import { billingService } from "@/services/billing.service";

describe("BillingSection — âncoras do tour", () => {
  beforeEach(() => {
    onboardingMockState.emTour = false;
    authMockState.status = "active";
    vi.clearAllMocks();
    vi.mocked(billingService.listPlans).mockResolvedValue([planoFake()]);
  });

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

  it("handleManage não chama billingService.openPortal quando emTour é true", async () => {
    // O botão "Trocar plano" não é desabilitado por `emTour` (só os botões
    // topo-de-tela são) — é o guard dentro de `handleManage` que precisa
    // impedir a chamada real à Stripe.
    onboardingMockState.emTour = true;
    vi.mocked(billingService.listPlans).mockResolvedValue([
      planoFake(),
      { ...planoFake(), id: "plan-2", slug: "avancado", name: "Avançado" },
    ]);

    render(<BillingSection />);

    const botaoTrocarPlano = await screen.findByText("Trocar plano");
    await userEvent.setup().click(botaoTrocarPlano);
    await screen.findAllByText("Avançado");

    const botaoUpgrade = (
      await screen.findAllByText("Fazer upgrade/downgrade")
    )[0];
    await userEvent.setup().click(botaoUpgrade);

    expect(billingService.openPortal).not.toHaveBeenCalled();
  });

  it("handleCheckout não chama billingService.startCheckout quando emTour é true", async () => {
    // Assinatura "canceled" faz o CTA do plano virar "Assinar este plano"
    // (fluxo de checkout) — também não é desabilitado por `emTour`.
    authMockState.status = "canceled";
    onboardingMockState.emTour = true;

    render(<BillingSection />);

    const botaoVerPlanos = await screen.findByText("Ver todos os planos");
    await userEvent.setup().click(botaoVerPlanos);

    const botaoAssinar = (
      await screen.findAllByText("Assinar este plano")
    )[0];
    await userEvent.setup().click(botaoAssinar);

    expect(billingService.startCheckout).not.toHaveBeenCalled();
  });
});
