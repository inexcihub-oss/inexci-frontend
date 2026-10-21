import { describe, it, expect } from "vitest";
import {
  applyBRLMask,
  brlMaskToDecimal,
  centsToDecimal,
  decimalToBRLMask,
  decimalToCents,
  formatMoney,
  numberToBRLMask,
  parseBRLValue,
} from "./currency";
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

describe("valores decimais da API (string)", () => {
  it("converte string decimal em centavos inteiros", () => {
    expect(decimalToCents("1234.5")).toBe(123450);
    expect(decimalToCents("0.1")).toBe(10);
    expect(decimalToCents("300")).toBe(30000);
    expect(decimalToCents("-12.34")).toBe(-1234);
    expect(decimalToCents(null)).toBe(0);
    expect(decimalToCents("")).toBe(0);
    expect(decimalToCents(19.99)).toBe(1999);
  });

  it("converte centavos em string decimal com duas casas", () => {
    expect(centsToDecimal(123450)).toBe("1234.50");
    expect(centsToDecimal(5)).toBe("0.05");
    expect(centsToDecimal(0)).toBe("0.00");
    expect(centsToDecimal(-1234)).toBe("-12.34");
  });

  it("vai da máscara para o decimal e de volta", () => {
    expect(brlMaskToDecimal("R$ 1.234,56")).toBe("1234.56");
    expect(brlMaskToDecimal("")).toBe("");
    expect(decimalToBRLMask("1234.56")).toBe("R$ 1.234,56");
    expect(decimalToBRLMask(null)).toBe("");
  });

  it("formata o valor em reais", () => {
    expect(formatMoney("1234.5").replace(/\s/g, " ")).toBe("R$ 1.234,50");
    expect(formatMoney(null).replace(/\s/g, " ")).toBe("R$ 0,00");
  });
});
