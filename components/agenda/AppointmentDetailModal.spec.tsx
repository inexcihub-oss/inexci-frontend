import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Appointment, AppointmentStatus } from "@/services/appointment.service";

let authState = { isDoctor: true };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import { AppointmentDetailModal } from "./AppointmentDetailModal";

function appointmentFixture(status: AppointmentStatus): Appointment {
  return {
    id: "a-1",
    doctorId: "d-1",
    patientId: "p-1",
    patient: { id: "p-1", name: "Ana Beatriz" },
    type: "return",
    status,
    scheduledAt: "2026-07-29T17:30:00.000Z",
    durationMinutes: 30,
    notes: null,
    cancellationReason: null,
  } as unknown as Appointment;
}

function renderModal(status: AppointmentStatus) {
  return render(
    <AppointmentDetailModal
      appointment={appointmentFixture(status)}
      onClose={vi.fn()}
      onEdit={vi.fn()}
      onStartAttendance={vi.fn()}
      onChangeStatus={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

describe("AppointmentDetailModal", () => {
  beforeEach(() => {
    authState = { isDoctor: true };
  });

  it("oferece iniciar o atendimento para o médico", () => {
    renderModal("confirmed");

    expect(
      screen.getByRole("button", { name: /Iniciar atendimento/i }),
    ).toBeInTheDocument();
  });

  /**
   * Quem agenda não atende: a secretária marca, confirma e cancela a consulta,
   * mas abrir a ficha é ato do médico.
   */
  it("não oferece iniciar o atendimento para quem não é médico", () => {
    authState = { isDoctor: false };
    renderModal("confirmed");

    expect(
      screen.queryByRole("button", { name: /atendimento/i }),
    ).not.toBeInTheDocument();
    // As ações de agenda continuam disponíveis.
    expect(
      screen.getByRole("button", { name: /Realizada/i }),
    ).toBeInTheDocument();
  });

  it("deixa o não-médico abrir em leitura a consulta já realizada", () => {
    authState = { isDoctor: false };
    renderModal("completed");

    expect(
      screen.getByRole("button", { name: /Ver atendimento/i }),
    ).toBeInTheDocument();
  });
});
