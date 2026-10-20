import { describe, expect, it } from "vitest";
import {
  CalEvent,
  addDays,
  appointmentToEvent,
  dateKey,
  isSameDay,
  layoutOverlaps,
  startOfWeek,
} from "./calendar";

function ev(id: string, start: string, end: string): CalEvent {
  return {
    id,
    kind: "appointment",
    start: new Date(start),
    end: new Date(end),
    allDay: false,
    title: id,
    subtitle: "",
  };
}

describe("helpers de data", () => {
  it("startOfWeek volta para o domingo", () => {
    const wed = new Date(2026, 6, 22, 15, 0);
    const sunday = startOfWeek(wed);
    expect(sunday.getDay()).toBe(0);
    expect(dateKey(sunday)).toBe("2026-07-19");
  });

  it("addDays e isSameDay", () => {
    const d = new Date(2026, 6, 22);
    expect(isSameDay(addDays(d, 0), d)).toBe(true);
    expect(isSameDay(addDays(d, 1), d)).toBe(false);
  });
});

describe("layoutOverlaps", () => {
  it("eventos sem sobreposição ficam em coluna única", () => {
    const result = layoutOverlaps([
      ev("a", "2026-07-22T09:00:00", "2026-07-22T09:30:00"),
      ev("b", "2026-07-22T10:00:00", "2026-07-22T10:30:00"),
    ]);
    expect(result.every((r) => r.cols === 1 && r.col === 0)).toBe(true);
  });

  it("dois eventos sobrepostos dividem em duas colunas", () => {
    const result = layoutOverlaps([
      ev("a", "2026-07-22T09:00:00", "2026-07-22T10:00:00"),
      ev("b", "2026-07-22T09:30:00", "2026-07-22T10:30:00"),
    ]);
    expect(result.every((r) => r.cols === 2)).toBe(true);
    expect(new Set(result.map((r) => r.col))).toEqual(new Set([0, 1]));
  });

  it("evento que começa após o cluster reinicia as colunas", () => {
    const result = layoutOverlaps([
      ev("a", "2026-07-22T09:00:00", "2026-07-22T10:00:00"),
      ev("b", "2026-07-22T09:30:00", "2026-07-22T10:30:00"),
      ev("c", "2026-07-22T11:00:00", "2026-07-22T11:30:00"),
    ]);
    const c = result.find((r) => r.event.id === "c")!;
    expect(c.cols).toBe(1);
    expect(c.col).toBe(0);
  });
});

describe("appointmentToEvent — sala e encaixe (MIG-03)", () => {
  const base = {
    id: "a-1",
    doctorId: "d-1",
    patientId: "p-1",
    patient: { id: "p-1", name: "Ana" },
    type: "return" as const,
    status: "confirmed" as const,
    scheduledAt: "2026-08-17T12:00:00.000Z",
    durationMinutes: 30,
    notes: null,
    cancellationReason: null,
    clinicId: "c-1",
    clinic: { id: "c-1", name: "Unidade Centro" },
  };

  it("sem sala mostra a clínica", () => {
    expect(appointmentToEvent(base, "Retorno").subtitle).toBe(
      "Retorno · Unidade Centro",
    );
  });

  it("a sala ocupa o lugar da clínica", () => {
    expect(
      appointmentToEvent(
        { ...base, room: { id: "r-1", name: "Consultório 02" } },
        "Retorno",
      ).subtitle,
    ).toBe("Retorno · Consultório 02");
  });

  it("encaixe vem primeiro", () => {
    expect(
      appointmentToEvent({ ...base, isWalkIn: true, clinic: null }, "Retorno")
        .subtitle,
    ).toBe("Encaixe · Retorno");
  });
});
