import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";

const comSolicitacoes = (p: Permission) =>
  p === Permission.ATENDIMENTO || p === Permission.SOLICITACOES;
let authState: { can: (p: Permission) => boolean } = {
  can: comSolicitacoes,
};
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

vi.mock("@/services/document.service", () => ({
  patientDocumentService: { list: vi.fn() },
}));

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: { getAvailableDoctors: vi.fn() },
}));

import { appointmentService } from "@/services/appointment.service";
import { patientDocumentService } from "@/services/document.service";
import { availableDoctorsService } from "@/services/available-doctors.service";
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
    authState = { can: comSolicitacoes };
    mocked(patientDocumentService.list).mockResolvedValue([]);
    mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      { id: "d-1", name: "Ana Nutricionista", crm: null, crmState: null },
    ]);
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
    expect(screen.getByText(/Dor lombar baixa/)).toBeInTheDocument();
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

  it("mantém o card da cirurgia mas esconde o link para quem não tem Solicitações", async () => {
    authState = { can: (p) => p === Permission.ATENDIMENTO };
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

  it("mostra ficha sem consulta no mesmo dia como atendimento sem consulta", async () => {
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
      await screen.findByRole("button", { name: /Atendimento sem consulta/ }),
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

  it("mostra quem atendeu e o resumo da ficha sem precisar abrir", async () => {
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    const cartao = await screen.findByRole("button", {
      name: /Primeira consulta/,
    });
    expect(cartao).toHaveTextContent("Ana Nutricionista");
    expect(cartao).toHaveTextContent("Lombalgia");
    expect(cartao).toHaveTextContent("M54.5");
  });

  it("junta a ficha migrada sem vínculo à consulta do mesmo dia e marca como realizada", async () => {
    mocked(appointmentService.getByPatient).mockResolvedValue([
      { ...pastAppointment, status: "waiting" },
      currentAppointment,
    ]);
    mocked(clinicalRecordService.getByPatient).mockResolvedValue([
      { ...record, appointmentId: null },
    ]);
    mocked(surgeryRequestService.getAll).mockResolvedValue({
      total: 0,
      records: [],
    });

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    const cartoes = await screen.findAllByRole("button", { expanded: false });
    expect(cartoes).toHaveLength(1);
    expect(cartoes[0]).toHaveTextContent(/Primeira consulta/);
    expect(cartoes[0]).toHaveTextContent(/Realizada/);
    expect(cartoes[0]).not.toHaveTextContent(/Aguardando/);
  });

  it("consulta passada que ficou em aberto e sem ficha aparece como 'Sem registro'", async () => {
    mocked(appointmentService.getByPatient).mockResolvedValue([
      { ...noShowAppointment, status: "waiting" },
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

    const cartao = await screen.findByRole("button", { name: /Retorno/ });
    expect(cartao).toHaveTextContent(/Sem registro/);
  });

  it("mostra selo dos documentos emitidos na ficha", async () => {
    mocked(patientDocumentService.list).mockResolvedValue([
      {
        id: "doc-1",
        patientId: "p-1",
        clinicalRecordId: "r-old",
        type: "prescription",
        key: "k",
        name: "receita.pdf",
        uri: "https://exemplo/receita.pdf",
        createdAt: "2025-12-20T14:00:00.000Z",
      },
    ]);

    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    expect(
      await screen.findByRole("button", { name: /Primeira consulta/ }),
    ).toHaveTextContent("Receita");
  });

  it("filtra só as cirurgias", async () => {
    const user = userEvent.setup();
    render(
      <PatientHistoryTab patientId="p-1" currentAppointmentId="a-current" />,
    );

    await user.click(await screen.findByRole("button", { name: "Cirurgias" }));

    const cartoes = screen.getAllByRole("button", { expanded: false });
    expect(cartoes).toHaveLength(1);
    expect(cartoes[0]).toHaveTextContent(/Artroscopia de joelho/);
  });
});
