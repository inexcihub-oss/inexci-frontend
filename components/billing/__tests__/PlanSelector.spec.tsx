import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SubscriptionPlan, SubscriptionStatus } from "@/types";
import { PlanSelector } from "../PlanSelector";

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
    expect(botoes).toHaveLength(4);
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
