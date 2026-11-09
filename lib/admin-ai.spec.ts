import { describe, it, expect } from "vitest";
import {
  formatVariation,
  previousRange,
  projectMonthCostCents,
  recordsLabel,
} from "./admin-ai";

describe("admin-ai", () => {
  it("projeta o mês: custo ÷ dias corridos × dias do mês", () => {
    expect(projectMonthCostCents(1000, "2026-10-10")).toBe(3100);
    expect(projectMonthCostCents(500, "2026-02-14")).toBe(1000);
    expect(projectMonthCostCents(0, "2026-10-24")).toBe(0);
  });

  it("calcula o período anterior de mesmo tamanho", () => {
    const prev = previousRange({
      from: "2026-10-01T03:00:00.000Z",
      to: "2026-10-11T03:00:00.000Z",
    });
    expect(prev).toEqual({
      from: "2026-09-21T03:00:00.000Z",
      to: "2026-10-01T03:00:00.000Z",
    });
  });

  it("formata a variação", () => {
    expect(formatVariation(150, 100)).toEqual({
      label: "+50%",
      direction: "up",
    });
    expect(formatVariation(50, 100)).toEqual({
      label: "-50%",
      direction: "down",
    });
    expect(formatVariation(100, 100).label).toBe("0%");
    expect(formatVariation(10, undefined).label).toBe("novo");
    expect(formatVariation(0, 0).label).toBe("—");
  });

  it("rotula os registros conforme a origem", () => {
    expect(recordsLabel("whatsapp").plural).toBe("Mensagens");
    expect(recordsLabel("document_extraction").plural).toBe("Extrações");
    expect(recordsLabel("").plural).toBe("Registros de uso");
  });
});
