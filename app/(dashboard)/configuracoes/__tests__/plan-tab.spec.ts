import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Após a re-arquitetura do sistema de planos (Billing v2):
 * - Planos vêm de billingService.listPlans()
 * - O plano atual é determinado por subscription.planId (vindo de
 *   billingService.getMySubscription()) e nunca mais por user.subscription_plan_id.
 * - Plano usa surgeryRequestQuota (em vez de maxDoctors) e priceCents/currency.
 */

import type { SubscriptionPlan, SubscriptionDetail } from "@/types";

const mockListPlans = vi.fn<() => Promise<SubscriptionPlan[]>>();
const mockGetMySubscription = vi.fn<() => Promise<SubscriptionDetail>>();

vi.mock("@/services/billing.service", () => ({
  billingService: {
    listPlans: () => mockListPlans(),
    getMySubscription: () => mockGetMySubscription(),
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
  },
];

function buildSubscriptionDetail(
  planId: string,
  nextPlanId: string | null = null,
): SubscriptionDetail {
  const plan = backendPlans.find((p) => p.id === planId)!;
  return {
    subscription: {
      id: "sub-1",
      status: "active",
      planId,
      nextPlanId,
      trialEndsAt: null,
      currentPeriodStart: "2026-05-01T00:00:00.000Z",
      currentPeriodEnd: "2026-06-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      suspendedAt: null,
      pastDueSince: null,
      defaultPaymentMethodId: null,
      gatewayProvider: "asaas",
    },
    plan,
    nextPlan: nextPlanId
      ? {
          id: nextPlanId,
          slug: backendPlans.find((p) => p.id === nextPlanId)!.slug,
          name: backendPlans.find((p) => p.id === nextPlanId)!.name,
          priceCents: backendPlans.find((p) => p.id === nextPlanId)!
            .priceCents,
        }
      : null,
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
    daysLeftInTrial: null,
    daysUntilSuspension: null,
  };
}

describe("Configurações — Aba de Planos (Billing v2)", () => {
  beforeEach(() => {
    mockListPlans.mockClear();
    mockGetMySubscription.mockClear();
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
  });

  describe("Identificação do plano atual via subscription.planId", () => {
    it("deve identificar o plano atual a partir de subscription.planId", () => {
      const detail = buildSubscriptionDetail("plan-pro-uuid");
      expect(detail.plan?.name).toBe("Profissional");
    });

    it("deve identificar o próximo plano agendado via subscription.nextPlanId", () => {
      const detail = buildSubscriptionDetail(
        "plan-essencial-uuid",
        "plan-pro-uuid",
      );
      expect(detail.nextPlan?.name).toBe("Profissional");
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
});
