import { describe, expect, it } from "vitest";
import {
  capitalizeFirst,
  formatDateBR,
  formatDoctorName,
  getLatestActivityMs,
} from "./formatters";

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

describe("formatDoctorName", () => {
  it("prefixa o tratamento em nome sem título", () => {
    expect(formatDoctorName("Carlos Mendonça")).toBe("Dr(a). Carlos Mendonça");
  });

  it("quem não é médico aparece só pelo nome", () => {
    expect(formatDoctorName("Luana Gomes", false)).toBe("Luana Gomes");
    expect(formatDoctorName("Carlos Mendonça", true)).toBe(
      "Dr(a). Carlos Mendonça",
    );
  });

  it.each([
    "Dr. Carlos Mendonça",
    "Dra. Ana Souza",
    "Dr(a). Paulo Lima",
    "dr. carlos",
    "Dr Carlos",
  ])("mantém o nome que já traz o tratamento: %s", (name) => {
    expect(formatDoctorName(name)).toBe(name);
  });

  it("não confunde nome próprio começado por Dr", () => {
    expect(formatDoctorName("Drauzio Varella")).toBe("Dr(a). Drauzio Varella");
  });

  it("devolve string vazia sem nome", () => {
    expect(formatDoctorName(undefined)).toBe("");
    expect(formatDoctorName(null)).toBe("");
    expect(formatDoctorName("   ")).toBe("");
  });
});

describe("capitalizeFirst", () => {
  it("capitaliza apenas a inicial da frase", () => {
    expect(capitalizeFirst("quarta-feira, 05 de agosto às 14:00")).toBe(
      "Quarta-feira, 05 de agosto às 14:00",
    );
  });

  it("é inofensivo em string vazia", () => {
    expect(capitalizeFirst("")).toBe("");
  });
});
