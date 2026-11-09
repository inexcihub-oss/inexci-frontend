import { describe, it, expect } from "vitest";
import { HEALTH_META, healthBandFromParam } from "../admin-health";

describe("lib/admin-health", () => {
  it.each([
    ["saudavel", "healthy"],
    ["atencao", "attention"],
    ["risco", "risk"],
  ])("converte ?saude=%s em %s", (param, band) => {
    expect(healthBandFromParam(param)).toBe(band);
  });

  it("ignora valor desconhecido ou vazio", () => {
    expect(healthBandFromParam("otima")).toBeUndefined();
    expect(healthBandFromParam(null)).toBeUndefined();
  });

  it("cada faixa tem cor própria", () => {
    expect(HEALTH_META.healthy.badge).toContain("emerald");
    expect(HEALTH_META.attention.badge).toContain("amber");
    expect(HEALTH_META.risk.badge).toContain("red");
  });
});
