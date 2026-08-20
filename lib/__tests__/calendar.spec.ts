import { describe, it, expect } from "vitest";
import { appointmentToEvent } from "@/lib/calendar";

const base = {
  id: "appt-1",
  doctorId: "doctor-1",
  patientId: "patient-1",
  type: "first_visit" as const,
  status: "scheduled" as const,
  scheduledAt: "2026-08-17T12:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  patient: { id: "patient-1", name: "João" },
  clinicId: null,
  clinic: null,
};

describe("appointmentToEvent", () => {
  it("acrescenta a clínica ao subtítulo quando há uma", () => {
    const evento = appointmentToEvent(
      { ...base, clinicId: "c-1", clinic: { id: "c-1", name: "Unidade Centro" } },
      "Primeira consulta",
    );
    expect(evento.subtitle).toBe("Primeira consulta · Unidade Centro");
  });

  it("mantém só o tipo quando a consulta não tem clínica", () => {
    expect(appointmentToEvent(base, "Primeira consulta").subtitle).toBe(
      "Primeira consulta",
    );
  });
});
