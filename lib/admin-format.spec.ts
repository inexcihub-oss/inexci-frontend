import { describe, it, expect } from "vitest";
import {
  formatUsdCents,
  formatBrlCents,
  formatQuota,
  formatMonthLabel,
  formatSpDate,
  pluralize,
  formatRelative,
  buildAccountsCsv,
  csvCell,
} from "./admin-format";

describe("admin-format", () => {
  it("formata centavos de dólar e de real", () => {
    expect(formatUsdCents(1240).replace(/\s/g, " ")).toBe("US$ 12,40");
    expect(formatBrlCents(81000).replace(/\s/g, " ")).toBe("R$ 810,00");
  });

  it("formata a cota com infinito para ilimitado", () => {
    expect(formatQuota({ used: 3, limit: 10 })).toBe("3 / 10");
    expect(formatQuota({ used: 2, limit: -1 })).toBe("2 / ∞");
  });

  it("formata o último acesso de forma relativa", () => {
    const agora = new Date("2026-10-24T15:00:00Z");
    expect(formatRelative(null, agora)).toBe("nunca");
    expect(formatRelative("2026-10-24T10:00:00Z", agora)).toBe("hoje");
    expect(formatRelative("2026-10-23T10:00:00Z", agora)).toBe("ontem");
    expect(formatRelative("2026-10-18T10:00:00Z", agora)).toBe("há 6 dias");
    expect(formatRelative("2026-08-20T10:00:00Z", agora)).toBe("há 2 meses");
  });

  it("gera o CSV com as colunas visíveis e escapa aspas", () => {
    const csv = buildAccountsCsv(
      [
        {
          name: 'Clínica "Ortho"',
          email: "a@b.com",
          plan: { name: "Starter" },
          situation: "trial",
          daysLeft: 4,
          daysOverdue: null,
          currentPeriodEnd: "2026-11-05T12:00:00.000Z",
          monthlyAmountCents: 0,
          doctors: 1,
          collaborators: 2,
          surgeryRequestsThisMonth: 3,
          quota: { used: 3, limit: -1 },
          aiCostThisMonthUsdCents: 210,
          lastSeenAt: null,
        },
      ],
      new Date("2026-10-24T15:00:00Z"),
    );
    const [header, linha] = csv.split("\n");
    expect(header).toBe(
      "Conta,E-mail,Plano,Situação,Mensalidade,Médicos,Colaboradores,SCs no mês,IA no mês,Último acesso",
    );
    expect(linha).toContain('"Clínica ""Ortho"""');
    expect(linha).toContain("Trial - faltam 4 dias");
    expect(linha).toContain("3 / ∞");
    expect(linha).toContain("US$ 2,10");
    expect(linha).toContain("nunca");
  });

  it("neutraliza células que começam como fórmula", () => {
    for (const perigoso of ["=1+1", "+cmd", "-2", "@SUM(A1)"]) {
      expect(csvCell(perigoso)).toBe(`"'${perigoso}"`);
    }
    expect(csvCell("normal")).toBe('"normal"');
  });

  it("preserva vírgula e quebra de linha dentro da célula", () => {
    expect(csvCell("Silva, Dr.")).toBe('"Silva, Dr."');
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
});

describe("formatSpDate e formatMonthLabel", () => {
  it("usa o dia de São Paulo", () => {
    expect(formatSpDate("2026-10-05T01:00:00Z")).toBe("04/10/2026");
    expect(formatSpDate(null)).toBe("—");
  });
  it("formata o mês", () => {
    expect(formatMonthLabel("2026-11")).toBe("nov/2026");
  });
});

describe("pluralize", () => {
  it("singular para 1 e plural para os demais", () => {
    expect(pluralize(1, "fatura", "faturas")).toBe("1 fatura");
    expect(pluralize(2, "fatura", "faturas")).toBe("2 faturas");
    expect(pluralize(0, "fatura", "faturas")).toBe("0 faturas");
  });
});
