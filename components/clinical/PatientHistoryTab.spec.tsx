import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";

// Usuário simulado com Solicitações concedida — é o eixo que decide se o link
// "Abrir solicitação" aparece na timeline.
let authState = { can: (p: Permission) => p === Permission.SOLICITACOES };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: { getByPatient: vi.fn() },
  };
});

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: { getByPatient: vi.fn() },
}));

vi.mock("@/services/surgery-request.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/surgery-request.service")
  >("@/services/surgery-request.service");
  return {
    ...actual,
    surgeryRequestService: { getAll: vi.fn() },
  };
});

import { appointmentService } from "@/services/appointment.service";
import { clinicalRecordService } from "@/services/clinical-record.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { PatientHistoryTab } from "./PatientHistoryTab";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const pastAppointment = {
  id: "a-old",
  doctorId: "d-1",
  patientId: "p-1",
  type: "first_visit" as const,
  status: "completed" as const,
  scheduledAt: "2025-12-20T13:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
};

const noShowAppointment = {
  ...pastAppointment,
  id: "a-noshow",
  status: "no_show" as const,
  type: "return" as const,
  scheduledAt: "2025-11-08T13:00:00.000Z",
};

const currentAppointment = {
  ...pastAppointment,
  id: "a-current",
  status: "confirmed" as const,
  scheduledAt: "2026-07-29T17:30:00.000Z",
};

const record = {
  id: "r-old",
  doctorId: "d-1",
  patientId: "p-1",
  appointmentId: "a-old",
  anamnesis: "<p>Dor lombar há 3 meses</p>",
  physicalExam: null,
  diagnosis: "<p>Lombalgia</p>",
  cidCodes: [{ code: "M54.5", description: "Dor lombar baixa" }],
  conduct: "<p>Fisioterapia 10 sessões</p>",
  finalizedAt: "2025-12-20T14:00:00.000Z",
  createdAt: "2025-12-20T13:30:00.000Z",
  updatedAt: "2025-12-20T14:00:00.000Z",
};

const surgery = {
  id: "sr-1",
  status: 6,
  surgeryDate: "2026-01-04T12:00:00.000Z",
  createdAt: "2025-12-21T12:00:00.000Z",
  patient: { id: "p-1", name: "Ana Beatriz" },
  procedure: { id: "proc-1", name: "Artroscopia de joelho" },
};

describe("PatientHistoryTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.SOLICITACOES };
    mocked(appointmentService.getByPatient).mockResolvedValue([
      pastAppointment,
      noShowAppointment,
      currentAppointment,
    ]);
    mocked(clinicalRecordService.getByPatient).mockResolvedValue([record]);
    mocked(surgeryRequestService.getAll).mockResolvedValue({
      total: 1,
      records: [surgery],
    });
  });

  it("busca somente as cirurgias do paciente", async () => {
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(await screen.findByText(/Artroscopia de joelho/)).toBeInTheDocument();
    expect(surgeryRequestService.getAll).toHaveBeenCalledWith({
      patientId: "p-1",
    });
  });

  it("omite a consulta atual e ordena do mais recente para o mais antigo", async () => {
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    const items = await screen.findAllByRole("button", { expanded: false });
    // Cirurgia 04/01/2026 > consulta 20/12/2025 > consulta 08/11/2025.
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(/Artroscopia de joelho/);
    expect(items[1]).toHaveTextContent(/Primeira consulta/);
    expect(items[2]).toHaveTextContent(/Retorno/);
  });

  it("expande a consulta e mostra as anotações do médico", async () => {
    const user = userEvent.setup();
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(await screen.findByRole("button", { name: /Primeira consulta/ }));

    expect(screen.getByText(/Dor lombar há 3 meses/)).toBeInTheDocument();
    expect(screen.getByText(/Fisioterapia 10 sessões/)).toBeInTheDocument();
    expect(screen.getByText(/M54\.5/)).toBeInTheDocument();
  });

  it("informa quando a consulta não tem ficha", async () => {
    const user = userEvent.setup();
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(await screen.findByRole("button", { name: /Retorno/ }));

    expect(
      screen.getByText(/Sem anotações registradas/i),
    ).toBeInTheDocument();
  });

  it("abre a solicitação cirúrgica em nova aba", async () => {
    const user = userEvent.setup();
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(
      await screen.findByRole("button", { name: /Artroscopia de joelho/ }),
    );

    const link = screen.getByRole("link", { name: /Abrir solicitação/i });
    expect(link).toHaveAttribute("href", "/solicitacao/sr-1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  /**
   * O card da cirurgia é a ponte deliberada da timeline e deve continuar
   * visível mesmo sem Solicitações — só o link para o detalhe (que o guard de
   * rota devolveria) não faz sentido.
   */
  it("mantém o card da cirurgia mas esconde o link para quem não tem Solicitações", async () => {
    authState = { can: () => false };
    const user = userEvent.setup();
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(
      await screen.findByRole("button", { name: /Artroscopia de joelho/ }),
    );

    expect(
      screen.queryByRole("link", { name: /Abrir solicitação/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra ficha avulsa como atendimento sem consulta", async () => {
    mocked(appointmentService.getByPatient).mockResolvedValue([
      currentAppointment,
    ]);
    mocked(clinicalRecordService.getByPatient).mockResolvedValue([
      { ...record, id: "r-avulso", appointmentId: null },
    ]);
    mocked(surgeryRequestService.getAll).mockResolvedValue({
      total: 0,
      records: [],
    });

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(
      await screen.findByRole("button", { name: /Atendimento avulso/ }),
    ).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há nada anterior", async () => {
    mocked(appointmentService.getByPatient).mockResolvedValue([
      currentAppointment,
    ]);
    mocked(clinicalRecordService.getByPatient).mockResolvedValue([]);
    mocked(surgeryRequestService.getAll).mockResolvedValue({
      total: 0,
      records: [],
    });

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(
      await screen.findByText(/Nenhuma consulta ou cirurgia anterior/i),
    ).toBeInTheDocument();
  });

  it("mostra mensagem de erro (não de vazio) quando alguma chamada falha", async () => {
    mocked(appointmentService.getByPatient).mockRejectedValue(
      new Error("Falha de rede"),
    );

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(
      await screen.findByText(/Não foi possível carregar o histórico/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Nenhuma consulta ou cirurgia anterior/i),
    ).not.toBeInTheDocument();
  });

  it("refaz as chamadas ao clicar em Tentar novamente e renderiza a timeline após sucesso", async () => {
    const user = userEvent.setup();
    mocked(appointmentService.getByPatient)
      .mockRejectedValueOnce(new Error("Falha de rede"))
      .mockResolvedValueOnce([
        pastAppointment,
        noShowAppointment,
        currentAppointment,
      ]);

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(
      await screen.findByRole("button", { name: /Tentar novamente/i }),
    );

    expect(
      await screen.findByText(/Artroscopia de joelho/),
    ).toBeInTheDocument();
    expect(appointmentService.getByPatient).toHaveBeenCalledTimes(2);
  });

  /**
   * Tarefa 17, ponto 3: a busca de cirurgias é isolada com `.catch()` — se
   * falhar sozinha (ex.: colaborador sem acesso a algum médico do paciente),
   * a aba de Histórico não pode cair inteira. Só a seção de cirurgias some.
   */
  it("degrada graciosamente quando só a busca de cirurgias falha", async () => {
    mocked(surgeryRequestService.getAll).mockRejectedValue(
      new Error("Sem acesso"),
    );

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(
      await screen.findByRole("button", { name: /Primeira consulta/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Artroscopia de joelho/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Não foi possível carregar o histórico/i),
    ).not.toBeInTheDocument();
  });
});
