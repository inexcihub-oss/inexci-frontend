import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const replace = vi.fn();
const back = vi.fn();
const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, back, push }),
  useSearchParams: () => searchParams,
  usePathname: () => "/atendimento/a-1",
}));

vi.mock("@/components/shared/RichTextEditor", () => ({
  RichTextEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? "editor"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/clinical/CidPicker", () => ({
  CidPicker: () => <div data-testid="cid-picker" />,
}));

vi.mock("@/components/clinical/PatientDocuments", () => ({
  PatientDocuments: () => <div>Documentos e exames</div>,
}));

vi.mock("@/components/patients/PatientRegistrationForm", () => ({
  PatientRegistrationForm: () => <div>Informações pessoais</div>,
}));

vi.mock("@/components/clinical/PatientHistoryTab", () => ({
  PatientHistoryTab: () => <div>Consultas e cirurgias anteriores</div>,
}));

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: {
    create: vi.fn(),
    update: vi.fn(),
    finalize: vi.fn(),
    delete: vi.fn(),
    generatePrescription: vi.fn(),
    generateMedicalCertificate: vi.fn(),
    generateExamReferral: vi.fn(),
    previewDocument: vi.fn(),
  },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { getById: vi.fn() },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { Permission } from "@/lib/permissions";

let authState: {
  user?: { id: string } | null;
  isDoctor: boolean;
  isPhysician?: boolean;
  canIssueClinicalDocuments?: boolean;
  can: (p: Permission) => boolean;
  permissions: Permission[];
} = {
  user: { id: "d-1" },
  isDoctor: true,
  isPhysician: true,
  canIssueClinicalDocuments: true,
  can: () => true,
  permissions: [Permission.ATENDIMENTO],
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/procedure.service", () => ({
  procedureService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

vi.mock("@/services/clinical-record-template.service", () => ({
  clinicalRecordTemplateService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

import { availableDoctorsService } from "@/services/available-doctors.service";
import { clinicalRecordService } from "@/services/clinical-record.service";
import { clinicalRecordTemplateService } from "@/services/clinical-record-template.service";
import { healthPlanService } from "@/services/health-plan.service";
import type { Patient } from "@/services/patient.service";
import { AtendimentoTabs } from "./AtendimentoTabs";

const patient = {
  id: "p-1",
  name: "Ana Beatriz",
  cpf: "12345678900",
  phone: "11988880000",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const appointment = {
  id: "a-1",
  doctorId: "d-1",
  patientId: "p-1",
  type: "return" as const,
  status: "confirmed" as const,
  scheduledAt: "2026-07-29T17:30:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  clinicId: null,
};

type Record_ = NonNullable<
  Parameters<typeof AtendimentoTabs>[0]["initialRecord"]
>;

function recordFixture(over: Partial<Record_> = {}): Record_ {
  return {
    id: "r-1",
    doctorId: "d-1",
    patientId: "p-1",
    appointmentId: "a-1",
    anamnesis: null,
    physicalExam: null,
    diagnosis: null,
    cidCodes: [],
    conduct: null,
    surgicalIndication: false,
    surgeryRequestId: null,
    procedureId: null,
    procedure: null,
    finalizedAt: null,
    createdAt: "2026-07-29T18:00:00.000Z",
    updatedAt: "2026-07-29T18:00:00.000Z",
    ...over,
  };
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function renderTabs(
  record: Record_ | null = null,
  over: Partial<Patient> = {},
) {
  return renderWithQuery(
    <AtendimentoTabs
      patient={{ ...patient, ...over }}
      appointment={appointment}
      initialRecord={record}
    />,
  );
}

describe("AtendimentoTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams = new URLSearchParams();
    authState = {
      user: { id: "d-1" },
      isDoctor: true,
      isPhysician: true,
      canIssueClinicalDocuments: true,
      can: () => true,
      permissions: [Permission.ATENDIMENTO],
    };
    onboardingMockState.emTour = false;
    (healthPlanService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    (
      clinicalRecordService.previewDocument as ReturnType<typeof vi.fn>
    ).mockResolvedValue("<html><body>previa</body></html>");
  });

  it("abre na aba Atendimento com as seções clínicas", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "Atendimento" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Anamnese")).toBeInTheDocument();
    expect(screen.getByText("Conduta / Plano")).toBeInTheDocument();
  });

  it('expõe data-tour="ficha-abas" na barra de abas', () => {
    renderTabs();

    expect(screen.getByRole("tablist")).toHaveAttribute(
      "data-tour",
      "ficha-abas",
    );
  });

  it("respeita a aba vinda da URL e ignora valor inválido", () => {
    searchParams = new URLSearchParams("tab=cadastro");
    const { unmount } = renderTabs();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    unmount();

    searchParams = new URLSearchParams("tab=xpto");
    renderTabs();
    expect(screen.getByRole("tab", { name: "Atendimento" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("preserva o texto digitado ao trocar de aba e voltar", async () => {
    const user = userEvent.setup();
    renderTabs();

    const anamnese = screen.getByLabelText(/Queixa principal/i);
    await user.type(anamnese, "Dor lombar há 3 meses");

    await user.click(screen.getByRole("tab", { name: "Documentos" }));
    expect(screen.getByText("Documentos e exames")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Atendimento" }));
    expect(screen.getByLabelText(/Queixa principal/i)).toHaveValue(
      "Dor lombar há 3 meses",
    );
  });

  it("reflete a aba escolhida na URL", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("tab", { name: "Histórico" }));

    expect(replace).toHaveBeenCalledWith("?tab=historico", { scroll: false });
  });

  it("mostra o indicador de não salvo ao editar e o esconde após salvar", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ anamnesis: "Dor lombar" }));
    renderTabs();

    expect(
      screen.queryByText(/Alterações não salvas/i),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    expect(screen.getByText(/Alterações não salvas/i)).toBeInTheDocument();

    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "p-1",
          appointmentId: "a-1",
          anamnesis: "Dor lombar",
        }),
      );
      expect(
        screen.queryByText(/Alterações não salvas/i),
      ).not.toBeInTheDocument();
    });
  });

  it("atualiza registro existente em vez de criar outro", async () => {
    const user = userEvent.setup();
    const existing = recordFixture({ anamnesis: "Inicial" });
    (
      clinicalRecordService.update as ReturnType<typeof vi.fn>
    ).mockResolvedValue(existing);
    renderTabs(existing);

    await user.type(screen.getByLabelText(/Queixa principal/i), " + evolução");
    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.update).toHaveBeenCalledWith(
        "r-1",
        expect.objectContaining({ anamnesis: "Inicial + evolução" }),
      );
      expect(clinicalRecordService.create).not.toHaveBeenCalled();
    });
  });

  it("não duplica a ficha ao tentar novamente após finalize() falhar", async () => {
    const user = userEvent.setup();
    const created = recordFixture({ anamnesis: "Dor lombar" });
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(created);
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Falha de rede"));
    (
      clinicalRecordService.update as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      ...created,
      anamnesis: "Dor lombar",
    });

    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await screen.findByText(/Falha de rede/i);
    expect(clinicalRecordService.create).toHaveBeenCalledTimes(1);

    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.update).toHaveBeenCalledWith(
        "r-1",
        expect.objectContaining({ anamnesis: "Dor lombar" }),
      );
    });
    expect(clinicalRecordService.create).toHaveBeenCalledTimes(1);
  });

  it("em ficha finalizada esconde as ações e mantém as demais abas", () => {
    renderTabs(
      recordFixture({
        anamnesis: "<p>Fechada</p>",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );

    expect(
      screen.queryByRole("button", { name: /Salvar rascunho/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Finalizado")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toBeInTheDocument();
  });

  it("pede confirmação ao clicar em Voltar com alterações pendentes e respeita o cancelamento", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(confirmSpy).toHaveBeenCalledWith(
      "Há alterações não salvas no atendimento. Sair mesmo assim?",
    );
    expect(back).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("envia o marcador de paciente cirúrgico ao salvar", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ surgicalIndication: true }));
    renderTabs();

    await user.click(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    );
    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.create).toHaveBeenCalledWith(
        expect.objectContaining({ surgicalIndication: true }),
      );
    });
  });

  it("envia o procedimento escolhido no picker ao salvar", async () => {
    const { procedureService } = await import("@/services/procedure.service");
    (procedureService.getAll as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "proc-1", name: "Artroscopia de joelho" },
    ]);
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({ surgicalIndication: true, procedureId: "proc-1" }),
    );
    const user = userEvent.setup();
    renderTabs();

    await user.click(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    );
    await user.click(
      screen.getByRole("button", { name: /selecionar procedimento/i }),
    );
    await user.click(await screen.findByText("Artroscopia de joelho"));

    const saveButtons = screen.getAllByRole("button", {
      name: /Salvar rascunho/i,
    });
    await user.click(saveButtons[0]);

    await waitFor(() => {
      expect(clinicalRecordService.create).toHaveBeenCalledWith(
        expect.objectContaining({ procedureId: "proc-1" }),
      );
    });
  });

  it("confirma a SC criada ao finalizar com o marcador ligado", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ surgicalIndication: true }));
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({
        surgicalIndication: true,
        surgeryRequestId: "sc-1",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );
    renderTabs();

    await user.click(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    );
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(/Solicitação cirúrgica criada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Abrir solicitação/i }),
    ).toHaveAttribute("href", "/solicitacao/sc-1");
  });

  it("esconde o link da SC para quem não tem a permissão Solicitações", async () => {
    authState = {
      user: { id: "d-1" },
      isDoctor: true,
      isPhysician: true,
      canIssueClinicalDocuments: true,
      can: (p) => p !== Permission.SOLICITACOES,
      permissions: [Permission.ATENDIMENTO],
    };
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ surgicalIndication: true }));
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({
        surgicalIndication: true,
        surgeryRequestId: "sc-1",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );
    renderTabs();

    await user.click(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    );
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(/Solicitação cirúrgica criada/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Abrir solicitação/i }),
    ).not.toBeInTheDocument();
  });

  it("avisa que a SC está em criação quando o backend não devolve o id", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ surgicalIndication: true }));
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({
        surgicalIndication: true,
        surgeryRequestId: null,
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );
    renderTabs();

    await user.click(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    );
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(
        "Atendimento finalizado. A solicitação cirúrgica está sendo criada.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A solicitação está sendo criada e aparecerá em Solicitações em instantes.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Abrir solicitação/i }),
    ).not.toBeInTheDocument();
  });

  it("não menciona solicitação ao finalizar sem o marcador", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture());
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }),
    );
    renderTabs();

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText("Atendimento finalizado."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Solicitação cirúrgica/i),
    ).not.toBeInTheDocument();
  });

  it("mantém o marcador visível e travado em ficha finalizada", () => {
    renderTabs(
      recordFixture({
        surgicalIndication: true,
        surgeryRequestId: "sc-1",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );

    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  describe("modelos de anamnese", () => {
    it("escreve o modelo aplicado nos campos da ficha", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordTemplateService.getAll as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          id: "tpl-1",
          doctorId: "d-1",
          name: "Lombalgia",
          specialty: null,
          anamnesis: "<p>Dor lombar há 3 meses</p>",
          physicalExam: null,
          diagnosis: null,
          conduct: null,
          cidCodes: null,
          usageCount: 1,
          createdAt: "2026-07-30",
          updatedAt: "2026-07-30",
        },
      ]);
      (
        clinicalRecordTemplateService.apply as ReturnType<typeof vi.fn>
      ).mockImplementation(async () => ({
        id: "tpl-1",
        doctorId: "d-1",
        name: "Lombalgia",
        specialty: null,
        anamnesis: "<p>Dor lombar há 3 meses</p>",
        physicalExam: null,
        diagnosis: null,
        conduct: null,
        cidCodes: null,
        usageCount: 2,
        createdAt: "2026-07-30",
        updatedAt: "2026-07-30",
      }));
      renderTabs();

      await user.click(await screen.findByText("Lombalgia"));

      await waitFor(() =>
        expect(
          (screen.getByLabelText(/Queixa principal/i) as HTMLTextAreaElement)
            .value,
        ).toBe("<p>Dor lombar há 3 meses</p>"),
      );
      expect(clinicalRecordService.update).not.toHaveBeenCalled();
      expect(clinicalRecordService.create).not.toHaveBeenCalled();
    });

    it("não oferece modelos em atendimento finalizado", async () => {
      (
        clinicalRecordTemplateService.getAll as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      renderTabs(recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }));

      expect(
        screen.queryByRole("button", { name: /salvar como modelo/i }),
      ).toBeNull();
    });
  });

  describe("documentos do atendimento", () => {
    it("persiste a ficha antes de emitir quando ela ainda não existe", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue(recordFixture({ id: "r-nova" }));
      (
        clinicalRecordService.generatePrescription as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "doc-1",
        name: "Receita",
        key: "prescription",
        type: "prescription",
        uri: "https://r2/receita.pdf",
        createdAt: "2026-07-30",
      });
      vi.stubGlobal("open", vi.fn());
      renderTabs();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.create).toHaveBeenCalled(),
      );
      expect(clinicalRecordService.generatePrescription).toHaveBeenCalledWith(
        expect.objectContaining({ clinicalRecordId: "r-nova" }),
      );
    });

    it("salva as alterações pendentes antes de emitir, para o CID entrar no documento", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue(recordFixture());
      (
        clinicalRecordService.generateMedicalCertificate as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: "doc-2",
        name: "Atestado",
        key: "medical_certificate",
        type: "medical_certificate",
        uri: "https://r2/atestado.pdf",
        createdAt: "2026-07-30",
      });
      vi.stubGlobal("open", vi.fn());
      renderTabs(recordFixture());

      await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.update).toHaveBeenCalled(),
      );
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ clinicalRecordId: "r-1" }),
      );
    });

    it("não cria a ficha ao apenas pré-visualizar", async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      await waitFor(() =>
        expect(clinicalRecordService.previewDocument).toHaveBeenCalledWith(
          "prescription",
          expect.objectContaining({ patientId: "p-1", doctorId: "d-1" }),
        ),
      );
      expect(clinicalRecordService.create).not.toHaveBeenCalled();
      expect(clinicalRecordService.update).not.toHaveBeenCalled();
    });

    it("não reenvia a ficha finalizada ao emitir um documento", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.generatePrescription as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "doc-3",
        name: "Receita",
        key: "prescription",
        type: "prescription",
        uri: "https://r2/receita.pdf",
        createdAt: "2026-07-30",
      });
      vi.stubGlobal("open", vi.fn());
      renderTabs(recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }));

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.generatePrescription).toHaveBeenCalled(),
      );
      expect(clinicalRecordService.update).not.toHaveBeenCalled();
      expect(clinicalRecordService.create).not.toHaveBeenCalled();
    });
  });

  describe("card de convênio", () => {
    it("mostra o nome do convênio, não a acomodação", async () => {
      (healthPlanService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          id: "hp-1",
          name: "Unimed Paulistana",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        },
      );
      renderTabs(null, {
        healthPlanId: "hp-1",
        healthPlanType: "Apartamento",
      });

      expect(await screen.findByText("Unimed Paulistana")).toBeInTheDocument();
      expect(healthPlanService.getById).toHaveBeenCalledWith("hp-1");
      expect(screen.getByText(/· Apartamento/)).toBeInTheDocument();
    });

    it("mostra um traço quando o paciente não tem convênio", () => {
      renderTabs(null, { healthPlanType: "Apartamento" });

      expect(healthPlanService.getById).not.toHaveBeenCalled();
      expect(screen.queryByText("Apartamento")).not.toBeInTheDocument();
    });
  });

  it("capitaliza só a inicial da data do atendimento", () => {
    renderTabs();

    expect(
      screen.getByText(/^Quarta-feira, 29 de julho às \d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  describe("dentista (CRO)", () => {
    beforeEach(() => {
      authState = {
        user: { id: "d-1" },
        isDoctor: true,
        isPhysician: false,
        canIssueClinicalDocuments: true,
        can: () => true,
        permissions: [Permission.ATENDIMENTO],
      };
    });

    it("emite receita, atestado e pedido de exame, sem indicação cirúrgica", () => {
      renderTabs();

      expect(
        screen.getByRole("button", { name: /receita/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", { name: "Paciente cirúrgico" }),
      ).not.toBeInTheDocument();
    });
  });

  it.each([
    ["com canIssueClinicalDocuments", { canIssueClinicalDocuments: true }],
    ["só com o conselho (resposta sem o campo)", {}],
  ])(
    "consulta de dentista (CRO) %s habilita os três documentos",
    async (_caso, extra) => {
      vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
        {
          id: "d-1",
          name: "Dra. Bia Dentista",
          crm: "4321",
          crmState: "RJ",
          council: "CRO",
          isPhysician: false,
          ...extra,
        },
      ]);
      renderTabs();

      await waitFor(() =>
        expect(
          screen.queryByRole("checkbox", { name: "Paciente cirúrgico" }),
        ).not.toBeInTheDocument(),
      );
      expect(screen.getByRole("button", { name: /receita/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /atestado/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /exames/i })).toBeEnabled();
      vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
        [],
      );
    },
  );

  describe("profissional de saúde que não é médico", () => {
    beforeEach(() => {
      authState = {
        user: { id: "d-1" },
        isDoctor: true,
        isPhysician: false,
        canIssueClinicalDocuments: false,
        can: () => true,
        permissions: [Permission.ATENDIMENTO],
      };
    });

    it("registra a ficha, sem documentos nem indicação cirúrgica", () => {
      renderTabs();

      expect(
        screen.getAllByRole("button", { name: /Salvar rascunho/i }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.queryByRole("button", { name: /receita/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("checkbox", { name: "Paciente cirúrgico" }),
      ).not.toBeInTheDocument();
    });

    it("deixa desmarcar a indicação já gravada, mas não marcar de novo", async () => {
      const user = userEvent.setup();
      renderTabs(recordFixture({ surgicalIndication: true }));

      expect(
        screen.getByText("Indicação cirúrgica é ato de médico (CRM)."),
      ).toBeInTheDocument();
      const checkbox = screen.getByRole("checkbox", {
        name: "Paciente cirúrgico",
      });
      expect(checkbox).toBeEnabled();
      expect(checkbox).toBeChecked();

      await user.click(checkbox);

      const desmarcado = screen.getByRole("checkbox", {
        name: "Paciente cirúrgico",
      });
      expect(desmarcado).not.toBeChecked();
      expect(desmarcado).toBeDisabled();
    });

    it("salva o rascunho depois de desmarcar a indicação", async () => {
      (
        clinicalRecordService.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue(recordFixture());
      const user = userEvent.setup();
      renderTabs(recordFixture({ surgicalIndication: true }));

      await user.click(
        screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
      );
      await user.click(
        screen.getAllByRole("button", { name: /Salvar rascunho/i })[0],
      );

      await waitFor(() =>
        expect(clinicalRecordService.update).toHaveBeenCalledWith(
          "r-1",
          expect.objectContaining({ surgicalIndication: false }),
        ),
      );
    });

    it("finaliza depois de desmarcar a indicação", async () => {
      (
        clinicalRecordService.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue(recordFixture());
      (
        clinicalRecordService.finalize as ReturnType<typeof vi.fn>
      ).mockResolvedValue(
        recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }),
      );
      const user = userEvent.setup();
      renderTabs(recordFixture({ surgicalIndication: true }));

      await user.click(
        screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
      );
      await user.click(screen.getByRole("button", { name: "Finalizar" }));

      await waitFor(() =>
        expect(clinicalRecordService.finalize).toHaveBeenCalledWith("r-1"),
      );
      expect(clinicalRecordService.update).toHaveBeenCalledWith(
        "r-1",
        expect.objectContaining({ surgicalIndication: false }),
      );
    });
  });

  it("médico logado numa consulta de profissional não médico não vê a indicação cirúrgica", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "d-1",
        name: "Luana Técnica",
        crm: null,
        crmState: null,
        isPhysician: false,
      },
    ]);
    renderTabs();

    await waitFor(() =>
      expect(
        screen.queryByRole("checkbox", { name: "Paciente cirúrgico" }),
      ).not.toBeInTheDocument(),
    );
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("médico com CRM sem número vê a indicação desabilitada, com o que falta", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "d-1",
        name: "Karina Clínica",
        crm: null,
        crmState: null,
        isPhysician: true,
      },
    ]);
    renderTabs();

    expect(
      await screen.findByText(
        "Preencha o número e a UF do CRM de Karina Clínica em Colaboradores para indicar cirurgia.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toBeDisabled();
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("médico com número mas sem UF do CRM também vê o que falta", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "d-1",
        name: "Otávio Ortopedista",
        crm: "52934046",
        crmState: null,
        isPhysician: true,
      },
    ]);
    renderTabs();

    expect(
      await screen.findByText(
        "Preencha o número e a UF do CRM de Otávio Ortopedista em Colaboradores para indicar cirurgia.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toBeDisabled();
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("não finaliza indicação cirúrgica de médico com CRM sem número", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "d-1",
        name: "Karina Clínica",
        crm: null,
        crmState: null,
        isPhysician: true,
      },
    ]);
    const user = userEvent.setup();
    renderTabs(recordFixture({ surgicalIndication: true }));

    await screen.findByText(
      "Preencha o número e a UF do CRM de Karina Clínica em Colaboradores para indicar cirurgia.",
    );
    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(
        /Preencha o número e a UF do CRM de Karina Clínica em Colaboradores ou desmarque "Paciente cirúrgico" para finalizar/,
      ),
    ).toBeInTheDocument();
    expect(clinicalRecordService.finalize).not.toHaveBeenCalled();
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("não finaliza indicação cirúrgica em consulta de profissional não médico, mas deixa desmarcar", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "d-1",
        name: "Luana Técnica",
        crm: null,
        crmState: null,
        isPhysician: false,
      },
    ]);
    (
      clinicalRecordService.update as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture());
    (
      clinicalRecordService.finalize as ReturnType<typeof vi.fn>
    ).mockResolvedValue(
      recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }),
    );
    const user = userEvent.setup();
    renderTabs(recordFixture({ surgicalIndication: true }));

    await screen.findByText(
      "Luana Técnica não é médico e não pode indicar cirurgia.",
    );
    await user.click(screen.getByRole("button", { name: "Finalizar" }));
    expect(
      await screen.findByText(/Desmarque "Paciente cirúrgico" para finalizar/),
    ).toBeInTheDocument();
    expect(clinicalRecordService.finalize).not.toHaveBeenCalled();

    const checkbox = screen.getByRole("checkbox", {
      name: "Paciente cirúrgico",
    });
    expect(checkbox).toBeEnabled();
    await user.click(checkbox);
    await user.click(screen.getByRole("button", { name: "Finalizar" }));
    await waitFor(() =>
      expect(clinicalRecordService.finalize).toHaveBeenCalled(),
    );
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("profissional da consulta fora da lista presume médico, sem herdar dados de outro", async () => {
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue([
      {
        id: "outro",
        name: "Luana Técnica",
        crm: null,
        crmState: null,
        isPhysician: false,
      },
    ]);
    renderTabs();

    await waitFor(() =>
      expect(availableDoctorsService.getAvailableDoctors).toHaveBeenCalled(),
    );
    expect(
      screen.getByRole("checkbox", { name: "Paciente cirúrgico" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /receita/i })).toBeEnabled();
    expect(screen.queryByText(/Luana Técnica/)).toBeNull();
    vi.mocked(availableDoctorsService.getAvailableDoctors).mockResolvedValue(
      [],
    );
  });

  it("não reenvia a indicação cirúrgica quando ela não mudou", async () => {
    (
      clinicalRecordService.update as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture({ surgicalIndication: true }));
    const user = userEvent.setup();
    renderTabs(recordFixture({ surgicalIndication: true }));

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor");
    await user.click(
      screen.getAllByRole("button", { name: /Salvar rascunho/i })[0],
    );

    await waitFor(() =>
      expect(clinicalRecordService.update).toHaveBeenCalled(),
    );
    expect(
      vi.mocked(clinicalRecordService.update).mock.calls[0][1],
    ).not.toHaveProperty("surgicalIndication");
  });

  it("ficha nova sem indicação não manda o campo", async () => {
    (
      clinicalRecordService.create as ReturnType<typeof vi.fn>
    ).mockResolvedValue(recordFixture());
    const user = userEvent.setup();
    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor");
    await user.click(
      screen.getAllByRole("button", { name: /Salvar rascunho/i })[0],
    );

    await waitFor(() =>
      expect(clinicalRecordService.create).toHaveBeenCalled(),
    );
    expect(
      vi.mocked(clinicalRecordService.create).mock.calls[0][0],
    ).not.toHaveProperty("surgicalIndication");
  });

  it("não finaliza indicação cirúrgica quando quem está logado não é médico (CRM)", async () => {
    authState = {
      user: { id: "d-1" },
      isDoctor: true,
      isPhysician: false,
      canIssueClinicalDocuments: true,
      can: () => true,
      permissions: [Permission.ATENDIMENTO],
    };
    const user = userEvent.setup();
    renderTabs(recordFixture({ surgicalIndication: true }));

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await waitFor(() =>
      expect(
        screen.getAllByText("Indicação cirúrgica é ato de médico (CRM)."),
      ).toHaveLength(2),
    );
    expect(clinicalRecordService.update).not.toHaveBeenCalled();
    expect(clinicalRecordService.finalize).not.toHaveBeenCalled();
  });

  it("médico que não é o profissional da consulta vê os documentos desabilitados", async () => {
    authState = {
      user: { id: "outro-medico" },
      isDoctor: true,
      isPhysician: true,
      canIssueClinicalDocuments: true,
      can: () => true,
      permissions: [Permission.ATENDIMENTO],
    };
    renderTabs();

    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
    expect(
      screen.getByText("Só o profissional da consulta pode emitir documentos."),
    ).toBeInTheDocument();
  });

  describe("excluir rascunho", () => {
    const excluir = () =>
      screen.queryByRole("button", { name: /Excluir rascunho/i });

    it("não aparece sem ficha salva nem em ficha finalizada", () => {
      const { unmount } = renderTabs(null);
      expect(excluir()).not.toBeInTheDocument();
      unmount();

      renderTabs(recordFixture({ finalizedAt: "2026-07-29T19:00:00.000Z" }));
      expect(excluir()).not.toBeInTheDocument();
    });

    it("não aparece para quem não é médico", () => {
      authState = { ...authState, isDoctor: false };
      renderTabs(recordFixture());

      expect(excluir()).not.toBeInTheDocument();
    });

    it("não aparece durante o tour", () => {
      onboardingMockState.emTour = true;
      renderTabs(recordFixture());

      expect(excluir()).not.toBeInTheDocument();
    });

    it("pede confirmação, exclui e volta para a agenda", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      renderTabs(recordFixture());

      await user.click(excluir()!);
      const dialogo = screen.getByRole("alertdialog", {
        name: "Excluir rascunho do atendimento",
      });
      expect(clinicalRecordService.delete).not.toHaveBeenCalled();

      await user.click(
        within(dialogo).getByRole("button", { name: "Excluir" }),
      );

      await waitFor(() =>
        expect(clinicalRecordService.delete).toHaveBeenCalledWith("r-1"),
      );
      expect(push).toHaveBeenCalledWith("/agenda");
    });

    it("invalida o cache das consultas para a Agenda não mostrar 'Em atendimento'", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      render(
        <QueryClientProvider client={queryClient}>
          <AtendimentoTabs
            appointment={appointment}
            patient={patient}
            initialRecord={recordFixture()}
          />
        </QueryClientProvider>,
      );

      await user.click(excluir()!);
      await user.click(screen.getByRole("button", { name: "Excluir" }));

      await waitFor(() =>
        expect(invalidate).toHaveBeenCalledWith({
          queryKey: ["appointments"],
        }),
      );
    });

    it("sem a permissão Agenda volta para o hub de atendimento", async () => {
      const user = userEvent.setup();
      authState = {
        ...authState,
        can: (p: Permission) => p !== Permission.AGENDA,
      };
      (
        clinicalRecordService.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(undefined);
      renderTabs(recordFixture());

      await user.click(excluir()!);
      await user.click(screen.getByRole("button", { name: "Excluir" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/atendimento"));
    });

    it("cancelar não exclui; erro do backend mostra a mensagem e fica na tela", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.delete as ReturnType<typeof vi.fn>
      ).mockRejectedValue({
        isAxiosError: true,
        response: {
          data: { message: "Um atendimento finalizado não pode ser excluído." },
        },
      });
      renderTabs(recordFixture());

      await user.click(excluir()!);
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(clinicalRecordService.delete).not.toHaveBeenCalled();

      await user.click(excluir()!);
      await user.click(screen.getByRole("button", { name: "Excluir" }));

      await waitFor(() =>
        expect(clinicalRecordService.delete).toHaveBeenCalledTimes(1),
      );
      expect(push).not.toHaveBeenCalled();
      expect(
        await screen.findByText(
          /não pode ser excluído|Não foi possível excluir/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("usuário não-médico", () => {
    beforeEach(() => {
      authState = {
        isDoctor: false,
        can: () => true,
        permissions: [Permission.ATENDIMENTO],
      };
    });

    it("esconde salvar, finalizar e a emissão de documentos", () => {
      renderTabs();

      expect(
        screen.queryByRole("button", { name: /Salvar rascunho/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Finalizar/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /receita/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Salvar como modelo/i }),
      ).not.toBeInTheDocument();
    });

    it("explica por que a ficha está travada e mantém a ficha em leitura", () => {
      renderTabs(recordFixture({ anamnesis: "<p>Dor lombar</p>" }));

      expect(
        screen.getByText(/Apenas médicos podem registrar/i),
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Queixa principal/i),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Dor lombar")).toBeInTheDocument();
    });

    it("mantém as demais abas acessíveis", async () => {
      const user = userEvent.setup();
      renderTabs(recordFixture());

      await user.click(screen.getByRole("tab", { name: "Histórico" }));
      expect(
        screen.getByText("Consultas e cirurgias anteriores"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("tab", { name: "Documentos" }));
      expect(screen.getByText("Documentos e exames")).toBeInTheDocument();
    });
  });

  it("sai da tela ao confirmar a saída com alterações pendentes", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Voltar" }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);

    confirmSpy.mockRestore();
  });

  it("desabilita Salvar rascunho e Finalizar durante o tour", () => {
    onboardingMockState.emTour = true;
    renderWithQuery(
      <AtendimentoTabs
        patient={patient}
        appointment={appointment}
        initialRecord={null}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /salvar rascunho/i })[0],
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /finalizar/i })[0],
    ).toBeDisabled();
  });

  it("mantém Salvar rascunho e Finalizar habilitados fora do tour", () => {
    renderWithQuery(
      <AtendimentoTabs
        patient={patient}
        appointment={appointment}
        initialRecord={null}
      />,
    );
    expect(
      screen.getAllByRole("button", { name: /salvar rascunho/i })[0],
    ).toBeEnabled();
    expect(
      screen.getAllByRole("button", { name: /finalizar/i })[0],
    ).toBeEnabled();
  });

  it("bloqueia as abas Histórico, Cadastro e Documentos durante o tour, mantendo Atendimento acessível", () => {
    onboardingMockState.emTour = true;
    renderWithQuery(
      <AtendimentoTabs
        patient={patient}
        appointment={appointment}
        initialRecord={null}
      />,
    );

    expect(screen.getByRole("tab", { name: "Histórico" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Documentos" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Atendimento" })).toBeEnabled();
  });

  it("mantém todas as abas acessíveis fora do tour", () => {
    renderWithQuery(
      <AtendimentoTabs
        patient={patient}
        appointment={appointment}
        initialRecord={null}
      />,
    );

    expect(screen.getByRole("tab", { name: "Histórico" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Cadastro" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "Documentos" })).toBeEnabled();
  });

  it("mantém os botões e as abas bloqueados mesmo fora do tour, se a consulta for a fabricada", () => {
    renderWithQuery(
      <AtendimentoTabs
        patient={patient}
        appointment={{ ...appointment, id: "tour-demo", clinicId: null }}
        initialRecord={null}
      />,
    );

    expect(onboardingMockState.emTour).toBe(false);
    expect(
      screen.getAllByRole("button", { name: /salvar rascunho/i })[0],
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: /finalizar/i })[0],
    ).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Histórico" })).toBeDisabled();
  });
});
