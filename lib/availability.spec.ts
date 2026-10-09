import { describe, it, expect } from "vitest";
import {
  bloqueioNoDia,
  blockAppliesTo,
  bloqueioAtinge,
  bloqueioNoHorario,
  dentroDaGrade,
  holidayOn,
  NATIONAL_FIXED_HOLIDAYS,
} from "./availability";

const slot = (start: string, end: string, free = true) => ({ start, end, free });

describe("dentroDaGrade", () => {
  const slots = [
    slot("2026-10-05T11:00:00.000Z", "2026-10-05T11:30:00.000Z"),
    slot("2026-10-05T11:30:00.000Z", "2026-10-05T12:00:00.000Z", false),
    slot("2026-10-05T17:00:00.000Z", "2026-10-05T17:30:00.000Z"),
  ];

  it("consulta que ocupa horários seguidos cabe; atravessando o fim não", () => {
    expect(dentroDaGrade(slots, new Date("2026-10-05T11:00:00.000Z"), 60)).toBe(true);
    expect(dentroDaGrade(slots, new Date("2026-10-05T11:30:00.000Z"), 60)).toBe(false);
    expect(dentroDaGrade(slots, new Date("2026-10-05T14:00:00.000Z"), 30)).toBe(false);
  });

  it("sem horários no dia não há grade para comparar", () => {
    expect(dentroDaGrade([], new Date(), 30)).toBeNull();
  });
});

describe("holidayOn e blockAppliesTo", () => {
  it("feriado recorrente bate em qualquer ano", () => {
    const lista = [
      { id: "1", name: "Natal", date: "2020-12-25", recurring: true, blocksAgenda: true },
      { id: "2", name: "Carnaval", date: "2026-02-17", recurring: false, blocksAgenda: true },
    ];
    expect(holidayOn(lista, "2031-12-25")?.name).toBe("Natal");
    expect(holidayOn(lista, "2027-02-17")).toBeUndefined();
  });

  it("bloqueio da clínica vale para todos; de profissional só para ele", () => {
    const b = (doctorId: string | null) =>
      ({ id: "b", doctorId, clinicId: null, startsAt: "", endsAt: "", allDay: false, reason: null });
    expect(blockAppliesTo(b(null), ["d1"])).toBe(true);
    expect(blockAppliesTo(b("d2"), ["d1"])).toBe(false);
    expect(blockAppliesTo(b("d2"), [])).toBe(true);
  });

  it("lista fixa de feriados nacionais tem 9 datas sem repetir", () => {
    expect(new Set(NATIONAL_FIXED_HOLIDAYS.map((h) => h.md)).size).toBe(9);
  });
});

describe("bloqueioAtinge (espelho do backend)", () => {
  const b = (doctorId: string | null, clinicId: string | null) => ({
    doctorId,
    clinicId,
  });

  it.each([
    [b(null, null), "X", true],
    [b(null, null), null, true],
    [b("D", null), "Y", true],
    [b(null, "X"), "X", true],
    [b(null, "X"), "Y", false],
    [b(null, "X"), null, false],
    [b("D", "X"), "X", true],
    [b("D", "X"), "Y", false],
    [b("D", "X"), null, true],
    [b("OUTRO", null), "X", false],
  ])("%o na clínica %s → %s", (bloqueio, clinica, esperado) => {
    expect(bloqueioAtinge(bloqueio, "D", clinica)).toBe(esperado);
  });
});

describe("bloqueioNoHorario", () => {
  const bloqueio = {
    id: "b",
    doctorId: "D",
    clinicId: null,
    startsAt: "2026-10-15T10:00:00Z",
    endsAt: "2026-10-15T11:00:00Z",
    allDay: false,
    reason: null,
  };

  it("acha o bloqueio que se sobrepõe à consulta", () => {
    expect(
      bloqueioNoHorario([bloqueio], "D", null, new Date("2026-10-15T10:30:00Z"), 30),
    ).toBe(bloqueio);
  });

  it("encostar no fim ou no começo não é sobrepor", () => {
    expect(
      bloqueioNoHorario([bloqueio], "D", null, new Date("2026-10-15T11:00:00Z"), 30),
    ).toBeUndefined();
    expect(
      bloqueioNoHorario([bloqueio], "D", null, new Date("2026-10-15T09:30:00Z"), 30),
    ).toBeUndefined();
  });
});

describe("bloqueioNoDia (visão mensal)", () => {
  const dia = new Date(2026, 9, 12);
  const iso = (d: number, h: number, m = 0) =>
    new Date(2026, 9, d, h, m).toISOString();

  it("bloqueio dentro do dia, ou atravessando a meia-noite, marca o dia", () => {
    expect(bloqueioNoDia({ startsAt: iso(12, 14), endsAt: iso(12, 16) }, dia)).toBe(true);
    expect(bloqueioNoDia({ startsAt: iso(11, 20), endsAt: iso(12, 2) }, dia)).toBe(true);
    expect(bloqueioNoDia({ startsAt: iso(10, 0), endsAt: iso(15, 0) }, dia)).toBe(true);
  });

  it("bloqueio que termina à meia-noite não vaza para o dia seguinte", () => {
    expect(bloqueioNoDia({ startsAt: iso(11, 8), endsAt: iso(12, 0) }, dia)).toBe(false);
    expect(bloqueioNoDia({ startsAt: iso(13, 0), endsAt: iso(13, 8) }, dia)).toBe(false);
  });
});
