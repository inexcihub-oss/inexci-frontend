import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";

const replace = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "p-1" }),
  useRouter: () => ({ push: vi.fn(), replace }),
  useSearchParams: () => search,
}));

let authState: { can: (p: Permission) => boolean } = {
  can: () => true,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/patient.service", () => ({
  patientService: { getById: vi.fn() },
}));
vi.mock("@/hooks/useHealthPlans", () => ({
  useHealthPlan: (id?: string | null) => ({
    healthPlan: id === "hp-1" ? { id: "hp-1", name: "UNIMED" } : null,
  }),
}));
vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: {
      getByPatient: vi.fn(),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    },
  };
});
vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: { getByPatient: vi.fn() },
}));
vi.mock("@/services/surgery-request.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/surgery-request.service")
  >("@/services/surgery-request.service");
  return { ...actual, surgeryRequestService: { getAll: vi.fn() } };
});
vi.mock("@/services/document.service", () => ({
  patientDocumentService: { list: vi.fn() },
}));
vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: { getAvailableDoctors: vi.fn() },
}));

vi.mock("@/components/patients/PatientRegistrationForm", () => ({
  PatientRegistrationForm: () => <div>formulario-de-cadastro</div>,
}));
vi.mock("@/components/patients/PatientPhotoField", () => ({
  PatientPhotoField: () => <div>foto</div>,
}));
vi.mock("@/components/clinical/PatientDocuments", () => ({
  PatientDocuments: () => <div>lista-de-documentos</div>,
}));
vi.mock("@/components/agenda/NewAppointmentModal", () => ({
  NewAppointmentModal: () => null,
}));
vi.mock("@/components/agenda/AppointmentDetailModal", () => ({
  AppointmentDetailModal: ({
    appointment,
    doctorName,
  }: {
    appointment: { id: string };
    doctorName?: string;
  }) => (
    <div role="dialog">
      consulta {appointment.id} com {doctorName}
    </div>
  ),
}));

import { patientService } from "@/services/patient.service";
import { appointmentService } from "@/services/appointment.service";
import { clinicalRecordService } from "@/services/clinical-record.service";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { patientDocumentService } from "@/services/document.service";
import { availableDoctorsService } from "@/services/available-doctors.service";
import PacienteDetalhePage from "./page";

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const base = {
  doctorId: "d-1",
  patientId: "p-1",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  clinicId: null,
};

const proxima = {
  ...base,
  id: "a-futura",
  type: "return" as const,
  status: "scheduled" as const,
  scheduledAt: "2099-03-10T13:30:00.000Z",
};
const realizada = {
  ...base,
  id: "a-passada",
  type: "first_visit" as const,
  status: "completed" as const,
  scheduledAt: "2020-05-04T13:00:00.000Z",
};

describe("página do paciente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = new URLSearchParams();
    authState = { can: () => true };
    mocked(patientService.getById).mockResolvedValue({
      id: "p-1",
      name: "Edite Lopes",
      phone: "24999990000",
      birthDate: "1960-01-15",
      healthPlanId: "hp-1",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    mocked(appointmentService.getByPatient).mockResolvedValue([
      proxima,
      realizada,
    ]);
    mocked(clinicalRecordService.getByPatient).mockResolvedValue([]);
    mocked(surgeryRequestService.getAll).mockResolvedValue({
      total: 0,
      records: [],
    });
    mocked(patientDocumentService.list).mockResolvedValue([]);
    mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      { id: "d-1", name: "Fabio Segall", crm: "1", crmState: "RJ" },
    ]);
  });

  it("abre no Cadastro, com as abas Cadastro, Histórico e Documentos", async () => {
    render(<PacienteDetalhePage />);

    const abas = await screen.findAllByRole("tab");
    expect(abas.map((a) => a.textContent)).toEqual([
      "Cadastro",
      "Histórico",
      "Documentos",
    ]);
    expect(screen.getByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("formulario-de-cadastro")).toBeVisible();
  });

  it("próximas consultas ficam na barra lateral, não na aba Histórico", async () => {
    const user = userEvent.setup();
    render(<PacienteDetalhePage />);

    const lateral = await screen.findByRole("list", {
      name: "Próximas consultas",
    });
    expect(lateral).toHaveTextContent(/Retorno/);
    expect(lateral).toHaveTextContent(/Fabio Segall/);

    await user.click(screen.getByRole("tab", { name: "Histórico" }));
    const painel = screen.getByRole("tabpanel");
    expect(
      within(painel).queryByRole("region", { name: "Próximas consultas" }),
    ).not.toBeInTheDocument();
    expect(within(painel).getByText(/Primeira consulta/)).toBeInTheDocument();
  });

  it("resume idade, convênio, telefone, última visita e próxima consulta no cabeçalho", async () => {
    render(<PacienteDetalhePage />);

    expect(await screen.findByText(/UNIMED/)).toHaveTextContent(
      /\d+ anos · UNIMED · \(24\) 99999-0000/,
    );
    expect(
      await screen.findByText(/Última visita 04\/05\/2020/),
    ).toHaveTextContent(/Próxima consulta 10\/03 às 10:30/);
  });

  it("clicar na próxima consulta abre o detalhe com o nome do profissional", async () => {
    const user = userEvent.setup();
    render(<PacienteDetalhePage />);

    const proximas = await screen.findByRole("list", {
      name: "Próximas consultas",
    });
    await user.click(within(proximas).getByRole("button", { name: /Retorno/ }));

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "consulta a-futura com Fabio Segall",
    );
  });

  it("trocar de aba mostra o conteúdo e grava a aba na URL", async () => {
    const user = userEvent.setup();
    render(<PacienteDetalhePage />);

    await user.click(await screen.findByRole("tab", { name: "Documentos" }));

    expect(screen.getByText("lista-de-documentos")).toBeVisible();
    expect(replace).toHaveBeenCalledWith("?tab=documentos", { scroll: false });
  });

  it("quem chega de outro fluxo com returnUrl cai direto no Cadastro", async () => {
    search = new URLSearchParams({ returnUrl: "/agenda" });
    render(<PacienteDetalhePage />);

    expect(await screen.findByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("formulario-de-cadastro")).toBeVisible();
  });

  it("sem Atendimento não há aba de Documentos nem busca de prontuário", async () => {
    authState = { can: (p) => p === Permission.AGENDA };
    render(<PacienteDetalhePage />);

    const abas = await screen.findAllByRole("tab");
    expect(abas.map((a) => a.textContent)).toEqual(["Cadastro", "Histórico"]);
    expect(clinicalRecordService.getByPatient).not.toHaveBeenCalled();
    expect(patientDocumentService.list).not.toHaveBeenCalled();
  });

  it("?tab= é respeitado quando as permissões chegam depois do primeiro render", async () => {
    search = new URLSearchParams({ tab: "documentos" });
    authState = { can: () => false };
    const { rerender } = render(<PacienteDetalhePage />);

    expect(await screen.findByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: "Documentos" })).toBeNull();

    authState = { can: () => true };
    rerender(<PacienteDetalhePage />);

    expect(
      await screen.findByRole("tab", { name: "Documentos" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("lista-de-documentos")).toBeVisible();
  });

  it("perder Atendimento com a aba Documentos aberta volta para o Cadastro", async () => {
    search = new URLSearchParams({ tab: "documentos" });
    const { rerender } = render(<PacienteDetalhePage />);
    expect(
      await screen.findByRole("tab", { name: "Documentos" }),
    ).toHaveAttribute("aria-selected", "true");

    authState = { can: (p) => p === Permission.AGENDA };
    rerender(<PacienteDetalhePage />);

    expect(screen.getByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByText("lista-de-documentos")).toBeNull();
  });
});
