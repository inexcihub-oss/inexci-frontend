import { describe, expect, it } from "vitest";

import { resolveBillingBanner } from "@/lib/billing-banner";
import type { SubscriptionDetail } from "@/types";

function assinatura(
  overrides: Partial<SubscriptionDetail["subscription"]> = {},
  extras: Partial<SubscriptionDetail> = {},
): SubscriptionDetail {
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
      ...overrides,
    },
    plan: null,
    nextPlan: null,
    quota: null,
    daysLeftInTrial: null,
    daysUntilSuspension: null,
    ...extras,
  } as SubscriptionDetail;
}

describe("resolveBillingBanner", () => {
  it("não avisa nada numa assinatura ativa e saudável", () => {
    expect(resolveBillingBanner(assinatura())).toBeNull();
  });

  it("não avisa nada sem assinatura carregada", () => {
    expect(resolveBillingBanner(null)).toBeNull();
    expect(resolveBillingBanner(undefined)).toBeNull();
  });

  it("avisa suspensão", () => {
    const variante = resolveBillingBanner(assinatura({ status: "suspended" }));
    expect(variante?.tone).toBe("danger");
    expect(variante?.title).toBe("Sua assinatura está suspensa");
  });

  it("avisa cancelamento", () => {
    const variante = resolveBillingBanner(assinatura({ status: "canceled" }));
    expect(variante?.title).toBe("Sua assinatura foi cancelada");
  });

  it("avisa inadimplência com a data de início da cobrança", () => {
    const variante = resolveBillingBanner(
      assinatura({
        status: "past_due",
        pastDueSince: "2026-08-03T00:00:00.000Z",
      }),
    );
    expect(variante?.description).toContain("03/08/2026");
  });

  it("avisa inadimplência sem data quando o backend não mandou", () => {
    const variante = resolveBillingBanner(assinatura({ status: "past_due" }));
    expect(variante?.title).toBe("Pagamento da última fatura falhou");
    expect(variante?.description).not.toContain("desde");
  });

  it("silencia o trial enquanto sobrar mais de uma semana", () => {
    expect(
      resolveBillingBanner(
        assinatura({ status: "trialing" }, { daysLeftInTrial: 8 }),
      ),
    ).toBeNull();
  });

  it("avisa o trial na última semana", () => {
    const variante = resolveBillingBanner(
      assinatura({ status: "trialing" }, { daysLeftInTrial: 3 }),
    );
    expect(variante?.title).toBe("Seu free trial termina em 3 dia(s)");
  });

  it("usa cópia própria no último dia de trial", () => {
    const variante = resolveBillingBanner(
      assinatura({ status: "trialing" }, { daysLeftInTrial: 0 }),
    );
    expect(variante?.title).toBe("Seu free trial termina hoje");
  });

  it("avisa cancelamento agendado com a data do fim do ciclo", () => {
    const variante = resolveBillingBanner(
      assinatura({ cancelAtPeriodEnd: true }),
    );
    expect(variante?.title).toBe("Cancelamento agendado");
    expect(variante?.description).toContain("01/09/2026");
  });

  it("dá precedência ao problema de pagamento sobre o cancelamento agendado", () => {
    const variante = resolveBillingBanner(
      assinatura({ status: "past_due", cancelAtPeriodEnd: true }),
    );
    expect(variante?.title).toBe("Pagamento da última fatura falhou");
  });
});
