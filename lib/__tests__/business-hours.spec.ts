import { describe, it, expect } from "vitest";
import {
  emptyBusinessHours,
  isWithinBusinessHours,
  mensagemForaDoHorario,
  normalizeBusinessHours,
  toMinutes,
} from "@/lib/business-hours";

/** Segunda-feira, 17/08/2026, no horário local. */
const segunda = (hh: number, mm = 0) => new Date(2026, 7, 17, hh, mm, 0, 0);
/** Domingo, 16/08/2026. */
const domingo = (hh: number, mm = 0) => new Date(2026, 7, 16, hh, mm, 0, 0);

const gradePadrao = normalizeBusinessHours({
  mon: [
    { start: "08:00", end: "12:00" },
    { start: "14:00", end: "18:00" },
  ],
});

describe("toMinutes", () => {
  it("converte HH:mm em minutos", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("14:30")).toBe(870);
  });
});

describe("normalizeBusinessHours", () => {
  it("completa os sete dias", () => {
    expect(normalizeBusinessHours(undefined)).toEqual(emptyBusinessHours());
    expect(normalizeBusinessHours({}).sat).toEqual([]);
  });
});

describe("isWithinBusinessHours", () => {
  it("aceita horário dentro do bloco", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(9), 30)).toEqual({
      open: true,
    });
  });

  it("aceita consulta que começa exatamente na abertura", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(8), 30).open).toBe(true);
  });

  it("aceita consulta que termina exatamente no fechamento", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(11, 30), 30).open).toBe(
      true,
    );
  });

  it("recusa dia sem nenhum bloco", () => {
    expect(isWithinBusinessHours(gradePadrao, domingo(10), 30)).toEqual({
      open: false,
      reason: "closed_day",
    });
  });

  it("recusa horário fora de qualquer bloco", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(13), 30)).toEqual({
      open: false,
      reason: "outside_hours",
    });
    expect(isWithinBusinessHours(gradePadrao, segunda(20), 30)).toEqual({
      open: false,
      reason: "outside_hours",
    });
  });

  it("recusa horário que começa exatamente no fechamento", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(12), 30).reason).toBe(
      "outside_hours",
    );
  });

  it("recusa consulta que começa dentro mas termina depois do fechamento", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(11, 45), 30)).toEqual({
      open: false,
      reason: "overflows_closing",
    });
  });

  it("recusa consulta que atravessa a meia-noite", () => {
    const grade = normalizeBusinessHours({
      mon: [{ start: "20:00", end: "23:59" }],
    });
    expect(isWithinBusinessHours(grade, segunda(23, 45), 60).reason).toBe(
      "overflows_closing",
    );
  });

  it("não deixa o intervalo de almoço passar como aberto", () => {
    expect(isWithinBusinessHours(gradePadrao, segunda(12, 30), 30).reason).toBe(
      "outside_hours",
    );
  });
});

describe("mensagemForaDoHorario", () => {
  it("devolve null quando está dentro do horário", () => {
    expect(
      mensagemForaDoHorario("Unidade Centro", gradePadrao, segunda(9), 30),
    ).toBeNull();
  });

  it("avisa quando a clínica não atende no dia", () => {
    expect(
      mensagemForaDoHorario("Unidade Centro", gradePadrao, domingo(10), 30),
    ).toBe("A clínica Unidade Centro não atende domingo.");
  });

  it("avisa o horário de funcionamento do dia quando está fora dele", () => {
    expect(
      mensagemForaDoHorario("Unidade Centro", gradePadrao, segunda(13), 30),
    ).toBe(
      "A clínica Unidade Centro não atende segunda-feira às 13:00. Funcionamento: 08:00–12:00, 14:00–18:00.",
    );
  });

  it("avisa quando a consulta termina depois do fechamento", () => {
    expect(
      mensagemForaDoHorario("Unidade Centro", gradePadrao, segunda(11, 45), 30),
    ).toBe(
      "A consulta terminaria às 12:15, depois do fechamento da clínica Unidade Centro (12:00).",
    );
  });
});
