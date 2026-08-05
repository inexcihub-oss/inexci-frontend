import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Appointment, AppointmentStatus } from "@/services/appointment.service";
import { Permission } from "@/lib/permissions";

// Usuário simulado com Agenda concedida — dono do fluxo de status/editar/excluir.
let authState: { isDoctor: boolean; can: (p: Permission) => boolean } = {
  isDoctor: true,
  can: (p) => p === Permission.AGENDA,
};
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

function renderModal(status: AppointmentStatus, doctorName?: string) {
  return render(
    <AppointmentDetailModal
      appointment={appointmentFixture(status)}
      doctorName={doctorName}
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
    authState = { isDoctor: true, can: (p) => p === Permission.AGENDA };
  });

  /**
   * D-07: o nome do médico costuma vir cadastrado com o tratamento, e o modal
   * prefixava "Dr(a)." de novo — "Dr(a). Dr. Carlos Mendonça".
   */
  it("não duplica o tratamento do médico", () => {
    renderModal("confirmed", "Dr. Carlos Mendonça");

    expect(screen.getByText("Dr. Carlos Mendonça")).toBeInTheDocument();
    expect(screen.queryByText(/Dr\(a\)\. Dr\./)).not.toBeInTheDocument();
  });

  it("prefixa o tratamento quando o nome não o tem", () => {
    renderModal("confirmed", "Carlos Mendonça");

    expect(screen.getByText("Dr(a). Carlos Mendonça")).toBeInTheDocument();
  });

  /**
   * D-10: a data vinha de um `capitalize` de CSS, que subia a inicial de cada
   * palavra ("Quarta-Feira, 29 De Julho").
   */
  it("capitaliza só a inicial da data", () => {
    renderModal("confirmed");

    expect(
      screen.getByText(/^Quarta-feira, 29 de julho · \d{2}:\d{2}/),
    ).toBeInTheDocument();
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
    authState = { isDoctor: false, can: (p) => p === Permission.AGENDA };
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
    authState = { isDoctor: false, can: (p) => p === Permission.AGENDA };
    renderModal("completed");

    expect(
      screen.getByRole("button", { name: /Ver atendimento/i }),
    ).toBeInTheDocument();
  });

  /**
   * Mexer na consulta (status, editar, excluir) exige a permissão Agenda —
   * eixo diferente de `isDoctor`. Sem ela, os botões de agenda somem, mas
   * o botão de atendimento (gateado por `isDoctor`) continua intacto.
   */
  it("esconde as ações de agenda (status, editar, excluir) para quem não tem a permissão Agenda", () => {
    authState = { isDoctor: true, can: () => false };
    renderModal("confirmed");

    expect(
      screen.queryByRole("button", { name: /Realizada/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Confirmar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Editar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Excluir/i }),
    ).not.toBeInTheDocument();
    // O botão de atendimento é outro eixo (isDoctor) e continua disponível.
    expect(
      screen.getByRole("button", { name: /Iniciar atendimento/i }),
    ).toBeInTheDocument();
  });
});
