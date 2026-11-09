import { describe, it, expect } from "vitest";
import { describeCouponDiscount, describeCouponUses } from "./admin-coupon";

const base = {
  percentOff: null,
  amountOffCents: null,
  duration: "once",
  durationInMonths: null,
} as const;

describe("describeCouponDiscount", () => {
  it("descreve percentual e valor fixo por duração", () => {
    const nbsp = / /g;
    expect(
      describeCouponDiscount({
        ...base,
        percentOff: 20,
        duration: "repeating",
        durationInMonths: 3,
      }),
    ).toBe("20% por 3 meses");
    expect(
      describeCouponDiscount({ ...base, percentOff: 20, duration: "forever" }),
    ).toBe("20% para sempre");
    expect(describeCouponDiscount({ ...base, percentOff: 20 })).toBe(
      "20% na primeira cobrança",
    );
    expect(
      describeCouponDiscount({ ...base, amountOffCents: 10000 }).replace(
        nbsp,
        " ",
      ),
    ).toBe("R$ 100,00 uma vez");
    expect(
      describeCouponDiscount({
        ...base,
        amountOffCents: 10000,
        duration: "repeating",
        durationInMonths: 3,
      }).replace(nbsp, " "),
    ).toBe("R$ 100,00 por 3 meses");
    expect(
      describeCouponDiscount({
        ...base,
        percentOff: 10,
        duration: "repeating",
        durationInMonths: 1,
      }),
    ).toBe("10% por 1 mês");
  });

  it("mostra usos com limite ou infinito", () => {
    expect(describeCouponUses({ timesRedeemed: 2, maxRedemptions: 10 })).toBe(
      "2 / 10",
    );
    expect(describeCouponUses({ timesRedeemed: 2, maxRedemptions: null })).toBe(
      "2 / ∞",
    );
  });
});
