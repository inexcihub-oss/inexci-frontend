import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SubscriptionStatusCard } from "../SubscriptionStatusCard";
import type { SubscriptionDetail } from "@/types";

const detail = {
  subscription: {
    id: "s1",
    status: "internal",
    planId: "p1",
    trialEndsAt: null,
    currentPeriodStart: "2026-08-01T00:00:00.000Z",
    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    canceledAt: null,
    suspendedAt: null,
    pastDueSince: null,
    gatewayProvider: "stripe",
  },
  plan: {
    id: "p1",
    slug: "pro",
    name: "Profissional",
    description: "d",
    priceCents: 49900,
    currency: "BRL",
    billingPeriod: "MONTHLY",
    surgeryRequestQuota: 100,
    sortOrder: 1,
    isTrialDefault: false,
  },
  nextPlan: null,
  quota: null,
  daysLeftInTrial: null,
  daysUntilSuspension: null,
} as SubscriptionDetail;

describe("SubscriptionStatusCard", () => {
  it("mostra acesso interno sem cobrança e sem preço", () => {
    render(<SubscriptionStatusCard detail={detail} />);
    expect(screen.getByText(/acesso interno — sem cobrança/i)).toBeTruthy();
    expect(screen.queryByText(/\/mês/)).toBeNull();
    expect(screen.queryByText(/bloqueado/i)).toBeNull();
  });
});
