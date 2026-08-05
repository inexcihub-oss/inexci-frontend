import { describe, it, expect } from "vitest";
import { HUB_TABS, hubTabQuery } from "./atendimento-hub";

// Meio da tarde: garante que "hoje em diante" inclui o resto do dia, e não só
// os dias seguintes.
const NOW = new Date("2026-07-30T15:30:00");
const START_OF_TODAY = new Date("2026-07-30T00:00:00").toISOString();

describe("hubTabQuery", () => {
  it("Hoje: janela de um dia, sem canceladas", () => {
    const q = hubTabQuery("today", NOW);

    expect(q.from).toBe(START_OF_TODAY);
    expect(q.to).toBe(new Date("2026-07-31T00:00:00").toISOString());
    expect(q.status).not.toContain("cancelled");
    expect(q.order).toBe("ASC");
  });

  it("Próximas: começa hoje e não tem teto de data", () => {
    const q = hubTabQuery("upcoming", NOW);

    expect(q.from).toBe(START_OF_TODAY);
    expect(q.to).toBeUndefined();
    expect(q.status).toEqual(["scheduled", "confirmed"]);
    expect(q.order).toBe("ASC");
  });

  it("Realizadas: todo o histórico, mais recente primeiro", () => {
    const q = hubTabQuery("done", NOW);

    expect(q.from).toBeUndefined();
    expect(q.to).toBeUndefined();
    expect(q.status).toEqual(["completed"]);
    expect(q.order).toBe("DESC");
  });

  it("toda aba do hub tem um recorte definido", () => {
    for (const t of HUB_TABS) {
      expect(hubTabQuery(t.key, NOW).status.length).toBeGreaterThan(0);
    }
  });
});
