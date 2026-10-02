import { describe, it, expect } from "vitest";
import {
  blockAppliesTo,
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
