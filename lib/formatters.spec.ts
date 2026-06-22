import { describe, expect, it } from "vitest";
import { formatDateBR, getLatestActivityMs } from "./formatters";

describe("getLatestActivityMs", () => {
  it("retorna o timestamp mais recente entre ISO e DD/MM/YYYY", () => {
    const latest = getLatestActivityMs(
      "2026-06-10T10:00:00.000Z",
      "2026-06-20T12:00:00.000Z",
      "01/06/2026",
    );

    expect(latest).toBe(Date.parse("2026-06-20T12:00:00.000Z"));
  });

  it("aceita datas brasileiras formatadas", () => {
    const latest = getLatestActivityMs("01/06/2026", "25/06/2026");

    expect(latest).toBe(new Date(2026, 5, 25).getTime());
  });
});

describe("formatDateBR", () => {
  it("formata ISO para DD/MM/YYYY", () => {
    expect(formatDateBR("2026-06-19T15:30:00.000Z")).toMatch(/^\d{2}\/06\/2026$/);
  });

  it("preserva o dia calendário para date-only ISO sem shift de timezone", () => {
    expect(formatDateBR("2026-06-10T00:00:00.000Z")).toBe("10/06/2026");
    expect(formatDateBR("2026-06-10")).toBe("10/06/2026");
  });
});
