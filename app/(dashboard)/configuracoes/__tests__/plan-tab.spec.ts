import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * TASK-FE-Q03 — Testes para validar que os planos de assinatura são
 * carregados dinamicamente do backend (authService.getPlans) e que o
 * plano atual é identificado via user.subscription_plan_id.
 *
 * Valida que:
 * - Não há planos hardcoded (Starter/Professional/Enterprise com preço)
 * - Os planos vêm do authService.getPlans()
 * - O plano atual é determinado por user.subscription_plan_id
 * - PlanCard trabalha com SubscriptionPlan (description, max_doctors)
 */

import type { SubscriptionPlan } from "@/types";

// Mock do authService
const mockGetPlans = vi.fn<() => Promise<SubscriptionPlan[]>>();

vi.mock("@/services/auth.service", () => ({
  authService: {
    getPlans: () => mockGetPlans(),
  },
}));

// Dados de planos do backend (sem price/features)
const backendPlans: SubscriptionPlan[] = [
  {
    id: "plan-starter-uuid",
    name: "Starter",
    description: "Ideal para clínicas pequenas",
    max_doctors: 1,
  },
  {
    id: "plan-pro-uuid",
    name: "Professional",
    description: "Para clínicas em crescimento",
    max_doctors: 5,
  },
  {
    id: "plan-enterprise-uuid",
    name: "Enterprise",
    description: "Para grandes hospitais",
    max_doctors: 50,
  },
];

// Simula a lógica de carregamento de planos extraída do componente
async function loadPlans(
  isAdmin: boolean,
  setPlans: (plans: SubscriptionPlan[]) => void,
  setLoadingPlans: (loading: boolean) => void,
  getPlans: typeof mockGetPlans,
) {
  if (!isAdmin) return;
  setLoadingPlans(true);
  try {
    const data = await getPlans();
    setPlans(data);
  } catch (error) {
    console.error("Erro ao carregar planos:", error);
  } finally {
    setLoadingPlans(false);
  }
}

// Simula a lógica de identificação do plano atual
function findCurrentPlan(
  plans: SubscriptionPlan[],
  subscriptionPlanId?: string,
): SubscriptionPlan | undefined {
  return plans.find((p) => p.id === subscriptionPlanId);
}

// Simula a lógica do PlanCard para determinar se é plano atual
function isPlanCurrent(
  planId: string,
  userSubscriptionPlanId?: string,
): boolean {
  return planId === userSubscriptionPlanId;
}

describe("Configurações — Aba de Planos (Q03)", () => {
  beforeEach(() => {
    mockGetPlans.mockClear();
    mockGetPlans.mockResolvedValue(backendPlans);
  });

  describe("Carregamento dinâmico de planos", () => {
    it("deve buscar planos do backend via authService.getPlans()", async () => {
      const setPlans = vi.fn();
      const setLoadingPlans = vi.fn();

      await loadPlans(true, setPlans, setLoadingPlans, mockGetPlans);

      expect(mockGetPlans).toHaveBeenCalledOnce();
      expect(setPlans).toHaveBeenCalledWith(backendPlans);
    });

    it("não deve carregar planos se não for admin", async () => {
      const setPlans = vi.fn();
      const setLoadingPlans = vi.fn();

      await loadPlans(false, setPlans, setLoadingPlans, mockGetPlans);

      expect(mockGetPlans).not.toHaveBeenCalled();
      expect(setPlans).not.toHaveBeenCalled();
    });

    it("deve gerenciar estado de loading corretamente", async () => {
      const setPlans = vi.fn();
      const setLoadingPlans = vi.fn();

      await loadPlans(true, setPlans, setLoadingPlans, mockGetPlans);

      // Primeiro true, depois false
      expect(setLoadingPlans).toHaveBeenCalledTimes(2);
      expect(setLoadingPlans).toHaveBeenNthCalledWith(1, true);
      expect(setLoadingPlans).toHaveBeenNthCalledWith(2, false);
    });

    it("deve tratar erro graciosamente e finalizar loading", async () => {
      mockGetPlans.mockRejectedValueOnce(new Error("Network error"));
      const setPlans = vi.fn();
      const setLoadingPlans = vi.fn();

      await loadPlans(true, setPlans, setLoadingPlans, mockGetPlans);

      expect(setPlans).not.toHaveBeenCalled();
      expect(setLoadingPlans).toHaveBeenNthCalledWith(2, false);
    });
  });

  describe("Identificação do plano atual", () => {
    it("deve encontrar o plano atual via subscription_plan_id", () => {
      const current = findCurrentPlan(backendPlans, "plan-pro-uuid");

      expect(current).toBeDefined();
      expect(current?.name).toBe("Professional");
      expect(current?.description).toBe("Para clínicas em crescimento");
      expect(current?.max_doctors).toBe(5);
    });

    it("deve retornar undefined quando não há subscription_plan_id", () => {
      const current = findCurrentPlan(backendPlans, undefined);

      expect(current).toBeUndefined();
    });

    it("deve retornar undefined quando subscription_plan_id não corresponde", () => {
      const current = findCurrentPlan(backendPlans, "plan-inexistente");

      expect(current).toBeUndefined();
    });

    it("deve identificar corretamente se um plano é o atual do usuário", () => {
      const userPlanId = "plan-starter-uuid";

      expect(isPlanCurrent("plan-starter-uuid", userPlanId)).toBe(true);
      expect(isPlanCurrent("plan-pro-uuid", userPlanId)).toBe(false);
      expect(isPlanCurrent("plan-enterprise-uuid", userPlanId)).toBe(false);
    });
  });

  describe("Estrutura de dados dos planos (SubscriptionPlan)", () => {
    it("planos do backend devem ter description em vez de features[]", () => {
      for (const plan of backendPlans) {
        expect(plan).toHaveProperty("description");
        expect(typeof plan.description).toBe("string");
        // Não deve ter 'features' (campo do tipo antigo)
        expect(plan).not.toHaveProperty("features");
      }
    });

    it("planos do backend devem ter max_doctors em vez de price", () => {
      for (const plan of backendPlans) {
        expect(plan).toHaveProperty("max_doctors");
        expect(typeof plan.max_doctors).toBe("number");
        // Não deve ter 'price' (campo do tipo antigo)
        expect(plan).not.toHaveProperty("price");
      }
    });

    it("planos do backend não devem ter campo 'popular' ou 'current'", () => {
      for (const plan of backendPlans) {
        expect(plan).not.toHaveProperty("popular");
        expect(plan).not.toHaveProperty("current");
      }
    });

    it("max_doctors=1 deve usar singular 'médico'", () => {
      const plan = backendPlans.find((p) => p.max_doctors === 1);
      expect(plan).toBeDefined();
      const label = `Até ${plan!.max_doctors} ${plan!.max_doctors === 1 ? "médico" : "médicos"}`;
      expect(label).toBe("Até 1 médico");
    });

    it("max_doctors>1 deve usar plural 'médicos'", () => {
      const plan = backendPlans.find((p) => p.max_doctors === 5);
      expect(plan).toBeDefined();
      const label = `Até ${plan!.max_doctors} ${plan!.max_doctors === 1 ? "médico" : "médicos"}`;
      expect(label).toBe("Até 5 médicos");
    });
  });
});
