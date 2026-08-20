import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SubscriptionPlan, SubscriptionStatus } from "@/types";
import { PlanSelector } from "../PlanSelector";

/**
 * O seletor de planos é o único caminho do dono da conta até a Stripe. As duas
 * regras que ele precisa garantir:
 *
 * - enquanto **não existe contrato** (trial em curso ou assinatura cancelada),
 *   `subscription.planId` é só a *escolha* feita no cadastro — nenhum card pode
 *   ser tratado como "Plano atual", senão o plano escolhido no teste vira o
 *   único que o usuário não consegue assinar;
 * - com contrato ativo, a troca precisa **levar o plano escolhido** para a
 *   Stripe; abrir o portal genérico perde a seleção.
 */

const plano = (over: Partial<SubscriptionPlan> & { id: string }): SubscriptionPlan => ({
  slug: over.id,
  name: over.id,
  description: null,
  priceCents: 45800,
  currency: "BRL",
  billingPeriod: "MONTHLY",
  surgeryRequestQuota: 10,
  sortOrder: 1,
  isTrialDefault: false,
  gatewayPriceId: `price_${over.id}`,
  ...over,
});

const STARTER = plano({ id: "starter", name: "Starter", sortOrder: 1 });
const ESSENCIAL = plano({ id: "essencial", name: "Essencial", sortOrder: 2 });

const onCheckout = vi.fn();
const onManage = vi.fn();

function renderSelector(status: SubscriptionStatus, currentPlanId: string) {
  return render(
    <PlanSelector
      plans={[STARTER, ESSENCIAL]}
      currentPlanId={currentPlanId}
      subscriptionStatus={status}
      onCheckout={onCheckout}
      onManage={onManage}
    />,
  );
}

/** O grid de desktop e o carrossel mobile renderizam o mesmo card. */
function botaoDoPlano(nome: string, label: RegExp) {
  const botoes = screen.getAllByRole("button", { name: label });
  expect(botoes.length).toBeGreaterThan(0);
  return botoes[0];
}

beforeEach(() => {
  onCheckout.mockClear();
  onManage.mockClear();
});

describe("PlanSelector", () => {
  it("deixa assinar o plano escolhido no trial", async () => {
    renderSelector("trialing", STARTER.id);

    const botoes = screen.getAllByRole("button", { name: /assinar este plano/i });
    expect(botoes).toHaveLength(4); // 2 planos × (carrossel + grid)
    expect(botoes.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.queryByText(/plano atual/i)).toBeNull();

    await userEvent.click(botoes[0]);
    expect(onCheckout).toHaveBeenCalledWith(STARTER);
  });

  it("deixa assinar o plano da assinatura cancelada", () => {
    renderSelector("canceled", STARTER.id);

    expect(screen.queryByText(/plano atual/i)).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /assinar este plano/i }).length,
    ).toBe(4);
  });

  it("com contrato ativo, mantém o plano atual travado e leva o plano escolhido à Stripe", async () => {
    renderSelector("active", STARTER.id);

    expect(screen.getAllByText(/plano atual/i).length).toBeGreaterThan(0);

    const trocar = botaoDoPlano(ESSENCIAL.name, /fazer upgrade\/downgrade/i);
    await userEvent.click(trocar);
    expect(onManage).toHaveBeenCalledWith(ESSENCIAL);
  });
});
