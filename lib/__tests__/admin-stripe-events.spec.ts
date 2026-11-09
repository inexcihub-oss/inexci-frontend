import { describe, it, expect } from "vitest";
import { canReprocess, stripeEventSituation } from "../admin-stripe-events";
import type { AdminStripeEvent } from "@/services/admin.service";

const base = {
  situation: "pending",
  stale: false,
} as AdminStripeEvent;

describe("lib/admin-stripe-events", () => {
  it("rotula as situações", () => {
    expect(
      stripeEventSituation({ ...base, situation: "processed" }).label,
    ).toBe("Processado");
    expect(stripeEventSituation({ ...base, situation: "failed" }).label).toBe(
      "Erro",
    );
    expect(stripeEventSituation({ ...base, stale: true }).label).toBe(
      "Pendente há mais de 1 h",
    );
    expect(stripeEventSituation(base).label).toBe("Pendente");
  });

  it("só permite reprocessar o que não foi processado", () => {
    expect(canReprocess({ ...base, situation: "processed" })).toBe(false);
    expect(canReprocess({ ...base, situation: "failed" })).toBe(true);
    expect(canReprocess(base)).toBe(true);
  });
});
