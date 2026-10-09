import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Appointment,
  AppointmentActivity,
  AppointmentStatus,
  appointmentService,
} from "@/services/appointment.service";
import { Permission } from "@/lib/permissions";
import { TOUR_DEMO_APPOINTMENT_ID } from "@/lib/onboarding/demo-data";

let authState: { isDoctor: boolean; can: (p: Permission) => boolean } = {
  isDoctor: true,
  can: (p) => p === Permission.AGENDA,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return { ...actual, appointmentService: { listActivities: vi.fn() } };
});

import {
  AppointmentDetailModal,
  formatWhen,
  statusAntesDaChegada,
} from "./AppointmentDetailModal";

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
    onboardingMockState.emTour = false;
  });

  it("não duplica o tratamento do médico", () => {
    renderModal("confirmed", "Dr. Carlos Mendonça");

    expect(screen.getByText("Dr. Carlos Mendonça")).toBeInTheDocument();
    expect(screen.queryByText(/Dr\(a\)\. Dr\./)).not.toBeInTheDocument();
  });

  it("prefixa o tratamento quando o nome não o tem", () => {
    renderModal("confirmed", "Carlos Mendonça");

    expect(screen.getByText("Dr(a). Carlos Mendonça")).toBeInTheDocument();
  });

  it("profissional que não é médico aparece sem 'Dr(a).'", () => {
    render(
      <AppointmentDetailModal
        appointment={appointmentFixture("confirmed")}
        doctorName="Luana Gomes"
        doctorIsPhysician={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onStartAttendance={vi.fn()}
        onChangeStatus={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Luana Gomes")).toBeInTheDocument();
    expect(screen.queryByText(/Dr\(a\)\. Luana/)).not.toBeInTheDocument();
  });

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

  it('expõe data-tour="atendimento-iniciar" no botão de iniciar atendimento', () => {
    renderModal("scheduled");

    expect(
      screen.getByRole("button", { name: /Iniciar atendimento/i }),
    ).toHaveAttribute("data-tour", "atendimento-iniciar");
  });

  it('expõe data-tour="agenda-consulta-acoes" na linha de botões de status', () => {
    renderModal("scheduled");

    expect(
      screen.getByRole("button", { name: /Confirmar/i }).closest(
        '[data-tour="agenda-consulta-acoes"]',
      ),
    ).not.toBeNull();
  });

  it("não oferece iniciar o atendimento para quem não é médico", () => {
    authState = { isDoctor: false, can: (p) => p === Permission.AGENDA };
    renderModal("confirmed");

    expect(
      screen.queryByRole("button", { name: /atendimento/i }),
    ).not.toBeInTheDocument();
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

  it("desabilita as ações rápidas de status e o botão Excluir durante o tour", () => {
    onboardingMockState.emTour = true;
    renderModal("scheduled");

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
  });

  it("Excluir pede confirmação; Cancelar e Esc não excluem nem fecham a consulta", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(
      <AppointmentDetailModal
        appointment={appointmentFixture("scheduled")}
        onClose={onClose}
        onEdit={vi.fn()}
        onStartAttendance={vi.fn()}
        onChangeStatus={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    const confirmacao = screen.getByRole("alertdialog", {
      name: "Excluir consulta",
    });
    expect(confirmacao).toHaveTextContent(/Ana Beatriz/);
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(
      within(confirmacao).getByRole("button", { name: "Cancelar" }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Excluir",
      }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("mantém as ações habilitadas fora do tour", () => {
    renderModal("scheduled");

    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeEnabled();
  });

  it("desabilita as ações mesmo fora do tour, se a consulta for a fabricada do tour", () => {
    renderAppointment({ ...consultaBase, id: "tour-demo", status: "scheduled" });

    expect(onboardingMockState.emTour).toBe(false);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
  });
});

describe("AppointmentDetailModal — sala de espera e dados da consulta (MIG-03)", () => {
  beforeEach(() => {
    authState = { isDoctor: true, can: (p) => p === Permission.AGENDA };
    onboardingMockState.emTour = false;
  });

  const botoes = () =>
    screen
      .getAllByRole("button")
      .map((b) => b.textContent?.trim())
      .filter(Boolean);

  it("agendada e confirmada oferecem 'Chegou'", () => {
    renderModal("scheduled");
    expect(botoes()).toContain("Chegou");
  });

  it("aguardando oferece desfazer a chegada e mostra o status", () => {
    renderModal("waiting");

    expect(screen.getByText("Aguardando")).toBeInTheDocument();
    expect(botoes()).toEqual(
      expect.arrayContaining(["Desfazer chegada", "Realizada", "Faltou", "Cancelar"]),
    );
    expect(botoes()).not.toContain("Chegou");
  });

  describe("Desfazer chegada", () => {
    const mudanca = (
      fromStatus: AppointmentStatus | null,
      toStatus: AppointmentStatus,
      createdAt: string,
    ): AppointmentActivity => ({
      id: createdAt,
      type: "status_change",
      fromStatus,
      toStatus,
      content: null,
      createdAt,
      user: null,
    });

    it("volta ao status de antes do último 'Chegou'", () => {
      expect(
        statusAntesDaChegada([
          mudanca("confirmed", "waiting", "2026-07-01T10:00:00Z"),
          mudanca("waiting", "scheduled", "2026-07-01T10:05:00Z"),
          mudanca("scheduled", "waiting", "2026-07-01T10:10:00Z"),
        ]),
      ).toBe("scheduled");
    });

    it("sem registro da chegada, volta a confirmada", () => {
      expect(statusAntesDaChegada([])).toBe("confirmed");
    });

    it("quem só estava agendado volta a agendado, não a confirmado", async () => {
      vi.mocked(appointmentService.listActivities).mockResolvedValue([
        mudanca("scheduled", "waiting", "2026-07-01T10:00:00Z"),
      ]);
      const onChangeStatus = vi.fn();
      render(
        <AppointmentDetailModal
          appointment={appointmentFixture("waiting")}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onStartAttendance={vi.fn()}
          onChangeStatus={onChangeStatus}
          onDelete={vi.fn()}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Desfazer chegada" }),
      );

      await waitFor(() =>
        expect(onChangeStatus).toHaveBeenCalledWith("scheduled"),
      );
      expect(appointmentService.listActivities).toHaveBeenCalledWith("a-1");
    });

    it("se o histórico falhar, volta a confirmada", async () => {
      vi.mocked(appointmentService.listActivities).mockRejectedValue(
        new Error("rede"),
      );
      const onChangeStatus = vi.fn();
      render(
        <AppointmentDetailModal
          appointment={appointmentFixture("waiting")}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onStartAttendance={vi.fn()}
          onChangeStatus={onChangeStatus}
          onDelete={vi.fn()}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Desfazer chegada" }),
      );

      await waitFor(() =>
        expect(onChangeStatus).toHaveBeenCalledWith("confirmed"),
      );
    });
    it("modal fechado antes do histórico chegar não muda o status", async () => {
      let soltar!: (v: AppointmentActivity[]) => void;
      vi.mocked(appointmentService.listActivities).mockReturnValue(
        new Promise((res) => {
          soltar = res;
        }),
      );
      const onChangeStatus = vi.fn();
      const { unmount } = render(
        <AppointmentDetailModal
          appointment={appointmentFixture("waiting")}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onStartAttendance={vi.fn()}
          onChangeStatus={onChangeStatus}
          onDelete={vi.fn()}
        />,
      );

      await userEvent.click(
        screen.getByRole("button", { name: "Desfazer chegada" }),
      );
      unmount();
      soltar([mudanca("scheduled", "waiting", "2026-07-01T10:00:00Z")]);
      await new Promise((r) => setTimeout(r, 0));

      expect(onChangeStatus).not.toHaveBeenCalled();
    });

    it("trocar de consulta antes do histórico chegar não muda o status", async () => {
      let soltar!: (v: AppointmentActivity[]) => void;
      vi.mocked(appointmentService.listActivities).mockReturnValue(
        new Promise((res) => {
          soltar = res;
        }),
      );
      const onChangeStatus = vi.fn();
      const props = {
        onClose: vi.fn(),
        onEdit: vi.fn(),
        onStartAttendance: vi.fn(),
        onChangeStatus,
        onDelete: vi.fn(),
      };
      const { rerender } = render(
        <AppointmentDetailModal appointment={appointmentFixture("waiting")} {...props} />,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "Desfazer chegada" }),
      );
      rerender(
        <AppointmentDetailModal
          appointment={{ ...appointmentFixture("waiting"), id: "a-2" }}
          {...props}
        />,
      );
      soltar([]);
      await new Promise((r) => setTimeout(r, 0));

      expect(onChangeStatus).not.toHaveBeenCalled();
    });
  });

  it("em atendimento oferece continuar o atendimento", () => {
    renderModal("in_progress");

    expect(screen.getByText("Em atendimento")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continuar atendimento" }),
    ).toBeInTheDocument();
  });

  it("médico pode iniciar o atendimento de quem está aguardando", () => {
    renderModal("waiting");

    expect(
      screen.getByRole("button", { name: "Iniciar atendimento" }),
    ).toBeInTheDocument();
  });

  it("ficha rascunho salva vira 'Continuar atendimento' mesmo com a consulta confirmada", () => {
    renderAppointment({ ...consultaBase, clinicalRecordStatus: "draft" });

    expect(
      screen.getByRole("button", { name: "Continuar atendimento" }),
    ).toBeInTheDocument();
  });

  it("sem ficha volta a 'Iniciar atendimento' mesmo com a consulta em atendimento", () => {
    renderAppointment({
      ...consultaBase,
      status: "in_progress",
      clinicalRecordStatus: null,
    });

    expect(
      screen.getByRole("button", { name: "Iniciar atendimento" }),
    ).toBeInTheDocument();
  });

  it("ficha finalizada mostra 'Ver atendimento'", () => {
    renderAppointment({
      ...consultaBase,
      status: "in_progress",
      clinicalRecordStatus: "finalized",
    });

    expect(
      screen.getByRole("button", { name: "Ver atendimento" }),
    ).toBeInTheDocument();
  });

  it("mostra encaixe, sala, convênio e quem agendou", () => {
    renderAppointment({
      ...consultaBase,
      isWalkIn: true,
      clinicId: "c-1",
      clinic: { id: "c-1", name: "Unidade Centro" },
      roomId: "r-1",
      room: { id: "r-1", name: "Consultório 02" },
      healthPlanId: "hp-1",
      healthPlan: { id: "hp-1", name: "UNIMED" },
      createdBy: { id: "u-1", name: "Carla" },
    });

    expect(screen.getByText("Encaixe")).toBeInTheDocument();
    expect(screen.getByText(/Unidade Centro · Consultório 02/)).toBeInTheDocument();
    expect(screen.getByText("UNIMED")).toBeInTheDocument();
    expect(screen.getByText("Agendada por Carla")).toBeInTheDocument();
  });

  it("sem convênio mostra particular e nada de encaixe", () => {
    renderModal("confirmed");

    expect(screen.getByText("Particular")).toBeInTheDocument();
    expect(screen.queryByText("Encaixe")).not.toBeInTheDocument();
  });
});

describe("AppointmentDetailModal — histórico (MIG-04)", () => {
  beforeEach(() => {
    authState = { isDoctor: true, can: (p) => p === Permission.AGENDA };
    onboardingMockState.emTour = false;
  });

  it("começa recolhido: o histórico só é buscado quando o usuário abre", () => {
    renderModal("confirmed");
    const toggle = screen.getByRole("button", { name: /Histórico/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Carregando histórico...")).not.toBeInTheDocument();
  });

  it("a consulta fabricada do tour não tem histórico", () => {
    renderAppointment({ ...consultaBase, id: TOUR_DEMO_APPOINTMENT_ID });
    expect(
      screen.queryByRole("button", { name: /Histórico/ }),
    ).not.toBeInTheDocument();
  });
});

describe("formatWhen — dia e horas no mesmo fuso", () => {
  it("formata as horas em America/Sao_Paulo, independente do fuso do navegador", () => {
    expect(formatWhen("2026-08-17T12:00:00.000Z", 30)).toBe(
      "Segunda-feira, 17 de agosto · 09:00 às 09:30",
    );
  });

  it("perto da meia-noite UTC, dia e hora continuam do mesmo fuso", () => {
    expect(formatWhen("2026-08-18T02:30:00.000Z", 60)).toBe(
      "Segunda-feira, 17 de agosto · 23:30 às 00:30",
    );
  });
});
