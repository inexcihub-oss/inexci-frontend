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

const consultaBase: Appointment = {
  id: "a-1",
  doctorId: "d-1",
  patientId: "p-1",
  patient: { id: "p-1", name: "Ana Beatriz" },
  type: "return",
  status: "confirmed",
  scheduledAt: "2026-07-29T17:30:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  clinicId: null,
  clinic: null,
};

function appointmentFixture(status: AppointmentStatus): Appointment {
  return { ...consultaBase, status };
}

// Helper de baixo nível: renderiza a partir de uma consulta já montada.
// `renderModal` (abaixo) é o atalho usado pelos testes que só variam o
// status/nome do médico; os testes de clínica precisam do objeto completo.
function renderAppointment(appointment: Appointment, doctorName?: string) {
  return render(
    <AppointmentDetailModal
      appointment={appointment}
      doctorName={doctorName}
      onClose={vi.fn()}
      onEdit={vi.fn()}
      onStartAttendance={vi.fn()}
      onChangeStatus={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
}

function renderModal(status: AppointmentStatus, doctorName?: string) {
  return renderAppointment(appointmentFixture(status), doctorName);
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

  it("mostra a clínica da consulta quando há uma", () => {
    renderAppointment({
      ...consultaBase,
      clinicId: "clinic-1",
      clinic: { id: "clinic-1", name: "Unidade Centro" },
    });

    expect(screen.getByText("Unidade Centro")).toBeInTheDocument();
  });

  /**
   * Minor: a linha da clínica usava um `div` avulso com `items-center`,
   * diferente das linhas vizinhas (`Row`, com `items-start`). Fixa o mesmo
   * padrão visual das outras linhas (Clock, Tag, User, FileText).
   */
  it("usa o mesmo layout (Row) das outras linhas para a clínica", () => {
    renderAppointment({
      ...consultaBase,
      clinicId: "clinic-1",
      clinic: { id: "clinic-1", name: "Unidade Centro" },
    });

    const linha = screen.getByText("Unidade Centro").closest("div");
    expect(linha).toHaveClass("items-start");
    expect(linha).not.toHaveClass("items-center");
  });

  it("omite a linha da clínica quando a consulta não tem unidade", () => {
    renderAppointment({ ...consultaBase, clinicId: null, clinic: null });

    expect(screen.queryByText(/local de atendimento/i)).not.toBeInTheDocument();
  });
});
