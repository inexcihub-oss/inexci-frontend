import { describe, it, expect } from "vitest";
import {
  quotaLabel,
  remainingQuotaLabel,
  solicitacoesLabel,
} from "./billing-format";

describe("plural de solicitação", () => {
  it.each([
    [0, "0 solicitações"],
    [1, "1 solicitação"],
    [10, "10 solicitações"],
  ])("solicitacoesLabel(%i) = %s", (n, esperado) => {
    expect(solicitacoesLabel(n)).toBe(esperado);
  });

  it('nunca concatena sufixo ("solicitaçãoões")', () => {
    expect(remainingQuotaLabel(10)).not.toContain("ãoões");
    expect(quotaLabel(10)).not.toContain("ãoões");
  });

  it("restantes concorda com o número", () => {
    expect(remainingQuotaLabel(10)).toBe("10 solicitações restantes");
    expect(remainingQuotaLabel(1)).toBe("1 solicitação restante");
  });

  it("quotaLabel", () => {
    expect(quotaLabel(30)).toBe("30 solicitações por mês");
    expect(quotaLabel(1)).toBe("1 solicitação por mês");
    expect(quotaLabel(-1)).toBe("Solicitações ilimitadas");
  });
});
