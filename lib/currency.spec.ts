import { describe, it, expect } from "vitest";
import { applyBRLMask, numberToBRLMask, parseBRLValue } from "./currency";
import { todayISODate } from "./calendar-date";

describe("currency", () => {
  it("mascara dígitos como centavos", () => {
    expect(applyBRLMask("")).toBe("");
    expect(applyBRLMask("5")).toBe("R$ 0,05");
    expect(applyBRLMask("123456")).toBe("R$ 1.234,56");
    expect(applyBRLMask("R$ 1.234,567")).toBe("R$ 12.345,67");
  });

  it("lê o valor mascarado", () => {
    expect(parseBRLValue("R$ 1.234,56")).toBeCloseTo(1234.56);
    expect(Number.isNaN(parseBRLValue(""))).toBe(true);
  });

  it("converte número em máscara", () => {
    expect(numberToBRLMask(1500.5)).toBe("R$ 1.500,50");
  });
});

describe("todayISODate", () => {
  it("usa a data local, não UTC", () => {
    expect(todayISODate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
