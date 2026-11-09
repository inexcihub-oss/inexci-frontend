import { describe, it, expect } from "vitest";
import { couponFormSchema, parseBrlToCents } from "./coupon.schema";

const valid = {
  code: "maio20",
  discountType: "percent" as const,
  value: "20",
  duration: "once" as const,
  durationInMonths: "",
  maxRedemptions: "",
  redeemBy: "",
  planIds: [],
};

describe("couponFormSchema", () => {
  it("aceita e converte o código para maiúsculas", () => {
    const r = couponFormSchema.safeParse(valid);
    expect(r.success && r.data.code).toBe("MAIO20");
  });

  it.each(["ab", "COM_UNDER", "com espaço"])("recusa código %s", (code) => {
    expect(couponFormSchema.safeParse({ ...valid, code }).success).toBe(false);
  });

  it("valida percentual de 1 a 100", () => {
    expect(couponFormSchema.safeParse({ ...valid, value: "0" }).success).toBe(
      false,
    );
    expect(couponFormSchema.safeParse({ ...valid, value: "101" }).success).toBe(
      false,
    );
    expect(couponFormSchema.safeParse({ ...valid, value: "100" }).success).toBe(
      true,
    );
  });

  it("valida valor fixo em reais", () => {
    const amount = { ...valid, discountType: "amount" as const };
    expect(
      couponFormSchema.safeParse({ ...amount, value: "100,50" }).success,
    ).toBe(true);
    expect(
      couponFormSchema.safeParse({ ...amount, value: "abc" }).success,
    ).toBe(false);
  });

  it("exige meses de 1 a 36 só para repeating", () => {
    expect(
      couponFormSchema.safeParse({ ...valid, duration: "repeating" }).success,
    ).toBe(false);
    expect(
      couponFormSchema.safeParse({
        ...valid,
        duration: "repeating",
        durationInMonths: "37",
      }).success,
    ).toBe(false);
    expect(
      couponFormSchema.safeParse({
        ...valid,
        duration: "repeating",
        durationInMonths: "3",
      }).success,
    ).toBe(true);
  });

  it("recusa limite inválido e validade no passado", () => {
    expect(
      couponFormSchema.safeParse({ ...valid, maxRedemptions: "0" }).success,
    ).toBe(false);
    expect(
      couponFormSchema.safeParse({ ...valid, redeemBy: "2020-01-01" }).success,
    ).toBe(false);
    expect(
      couponFormSchema.safeParse({ ...valid, redeemBy: "2999-01-01" }).success,
    ).toBe(true);
  });

  it("converte reais em centavos", () => {
    expect(parseBrlToCents("19,90")).toBe(1990);
    expect(parseBrlToCents("19.90")).toBe(1990);
    expect(parseBrlToCents("1.234,56")).toBe(123456);
    expect(parseBrlToCents("1.234")).toBe(123400);
    expect(parseBrlToCents("100")).toBe(10000);
    expect(parseBrlToCents("0")).toBeNull();
    expect(parseBrlToCents("1.2.3")).toBeNull();
    expect(parseBrlToCents("19,999")).toBeNull();
  });
});
