import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Após a re-arquitetura do sistema de planos (Billing v2 → Stripe Checkout + Portal):
 * - Planos vêm de billingService.listPlans()
 * - O plano atual é determinado por subscription.planId
 * - Checkout é iniciado via billingService.startCheckout(planId) → { url }
 * - Gerenciamento (upgrade/cancelamento/cartão) é via billingService.openPortal() → { url }
 * - Não há mais changePlan/cancel/resume/payment-methods/invoices no service
 */

import type { SubscriptionPlan, SubscriptionDetail } from "@/types";

const mockListPlans = vi.fn<() => Promise<SubscriptionPlan[]>>();
const mockGetMySubscription = vi.fn<() => Promise<SubscriptionDetail>>();
const mockStartCheckout = vi.fn<(planId: string) => Promise<{ url: string }>>();
const mockOpenPortal = vi.fn<() => Promise<{ url: string }>>();

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: () => mockListPlans(),
    getMySubscription: () => mockGetMySubscription(),
    startCheckout: (planId: string) => mockStartCheckout(planId),
    openPortal: () => mockOpenPortal(),
  },
}));

const backendPlans: SubscriptionPlan[] = [
  {
    id: "plan-trial-uuid",
    slug: "free-trial",
    name: "Free Trial",
    description: "30 dias grátis",
    priceCents: 0,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: 10,
    sortOrder: 0,
    isTrialDefault: true,
    gatewayPriceId: null,
  },
  {
    id: "plan-essencial-uuid",
    slug: "essencial",
    name: "Essencial",
    description: "Para clínicas pequenas",
    priceCents: 19900,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: 30,
    sortOrder: 1,
    isTrialDefault: false,
    gatewayPriceId: "price_essencial_monthly",
  },
  {
    id: "plan-pro-uuid",
    slug: "profissional",
    name: "Profissional",
    description: "Para clínicas em crescimento",
    priceCents: 49900,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: 100,
    sortOrder: 2,
    isTrialDefault: false,
    gatewayPriceId: "price_profissional_monthly",
  },
  {
    id: "plan-enterprise-uuid",
    slug: "enterprise",
    name: "Enterprise",
    description: "Para grandes hospitais",
    priceCents: 99900,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: -1,
    sortOrder: 3,
    isTrialDefault: false,
    gatewayPriceId: null,
  },
];

function buildSubscriptionDetail(
  planId: string,
  status: SubscriptionDetail["subscription"]["status"] = "active",
): SubscriptionDetail {
  const plan = backendPlans.find((p) => p.id === planId)!;
  return {
    subscription: {
      id: "sub-1",
      status,
      planId,
      trialEndsAt: status === "trialing" ? "2026-07-23T00:00:00.000Z" : null,
      currentPeriodStart: "2026-05-01T00:00:00.000Z",
      currentPeriodEnd: "2026-06-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      suspendedAt: null,
      pastDueSince: null,
      gatewayProvider: "stripe",
    },
    plan,
    nextPlan: null,
    quota: {
      used: 5,
      limit: plan.surgeryRequestQuota,
      isUnlimited: plan.surgeryRequestQuota === -1,
      remaining:
        plan.surgeryRequestQuota === -1
          ? Number.POSITIVE_INFINITY
          : Math.max(0, plan.surgeryRequestQuota - 5),
      periodStart: "2026-05-01T00:00:00.000Z",
      periodEnd: "2026-06-01T00:00:00.000Z",
    },
    daysLeftInTrial: status === "trialing" ? 29 : null,
    daysUntilSuspension: null,
  };
}

describe("Configurações — Aba de Planos (Billing v2 Stripe)", () => {
  beforeEach(() => {
    mockListPlans.mockClear();
    mockGetMySubscription.mockClear();
    mockStartCheckout.mockClear();
    mockOpenPortal.mockClear();
    mockListPlans.mockResolvedValue(backendPlans);
  });

  describe("Carregamento de planos via billingService", () => {
    it("listPlans deve retornar a lista de planos disponíveis", async () => {
      const data = await mockListPlans();
      expect(data).toHaveLength(4);
      expect(data.every((p) => typeof p.surgeryRequestQuota === "number")).toBe(
        true,
      );
    });

    it("planos com gatewayPriceId são assináveis via Checkout", async () => {
      const data = await mockListPlans();
      const pagos = data.filter((p) => !!p.gatewayPriceId);
      expect(pagos.length).toBeGreaterThan(0);
      expect(pagos.every((p) => p.slug !== "enterprise")).toBe(true);
    });

    it("enterprise não tem gatewayPriceId (deve mostrar 'Fale conosco')", async () => {
      const data = await mockListPlans();
      const enterprise = data.find((p) => p.slug === "enterprise");
      expect(enterprise?.gatewayPriceId).toBeFalsy();
    });
  });

  describe("Identificação do plano atual via subscription.planId", () => {
    it("deve identificar o plano atual a partir de subscription.planId", () => {
      const detail = buildSubscriptionDetail("plan-pro-uuid");
      expect(detail.plan?.name).toBe("Profissional");
    });

    it("assinatura em trial tem daysLeftInTrial", () => {
      const detail = buildSubscriptionDetail("plan-trial-uuid", "trialing");
      expect(detail.daysLeftInTrial).toBe(29);
    });
  });

  describe("Estrutura de dados dos planos (SubscriptionPlan v2)", () => {
    it("não deve mais ter o campo legado max_doctors", () => {
      for (const plan of backendPlans) {
        expect(plan).not.toHaveProperty("max_doctors");
      }
    });

    it("deve ter priceCents, currency e billingPeriod", () => {
      for (const plan of backendPlans) {
        expect(typeof plan.priceCents).toBe("number");
        expect(plan.currency).toBe("BRL");
        expect(["MONTHLY", "YEARLY"]).toContain(plan.billingPeriod);
      }
    });

    it("surgeryRequestQuota === -1 representa ilimitado", () => {
      const enterprise = backendPlans.find((p) => p.slug === "enterprise");
      expect(enterprise?.surgeryRequestQuota).toBe(-1);
    });
  });

  describe("startCheckout — inicia Checkout Session no Stripe", () => {
    it("retorna { url } para plano com gatewayPriceId", async () => {
      const stripeUrl = "https://checkout.stripe.com/pay/cs_test_abc";
      mockStartCheckout.mockResolvedValue({ url: stripeUrl });

      const result = await mockStartCheckout("plan-essencial-uuid");
      expect(result.url).toBe(stripeUrl);
    });

    it("é chamado com o planId correto", async () => {
      mockStartCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
      await mockStartCheckout("plan-pro-uuid");
      expect(mockStartCheckout).toHaveBeenCalledWith("plan-pro-uuid");
    });
  });

  describe("openPortal — abre Customer Portal da Stripe", () => {
    it("retorna { url } do Portal da Stripe", async () => {
      const portalUrl = "https://billing.stripe.com/portal/session/bps_xxx";
      mockOpenPortal.mockResolvedValue({ url: portalUrl });

      const result = await mockOpenPortal();
      expect(result.url).toBe(portalUrl);
    });

    it("não recebe parâmetros (planId é gerenciado pelo Portal)", async () => {
      mockOpenPortal.mockResolvedValue({ url: "https://billing.stripe.com/p" });
      await mockOpenPortal();
      expect(mockOpenPortal).toHaveBeenCalledWith();
    });
  });

  describe("Ausência de métodos legados no billingService", () => {
    it("não deve existir changePlan no mock (foi removido)", () => {
      const service = { listPlans: mockListPlans, getMySubscription: mockGetMySubscription, startCheckout: mockStartCheckout, openPortal: mockOpenPortal };
      expect(service).not.toHaveProperty("changePlan");
      expect(service).not.toHaveProperty("cancel");
      expect(service).not.toHaveProperty("resume");
      expect(service).not.toHaveProperty("listPaymentMethods");
      expect(service).not.toHaveProperty("listInvoices");
    });
  });
});
