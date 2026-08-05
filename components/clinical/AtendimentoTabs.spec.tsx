import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
const back = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, back, push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => "/atendimento/a-1",
}));

// O Tiptap não roda bem no jsdom; o editor é substituído por um textarea
// controlado com o mesmo contrato (value/onChange).
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
    generatePrescription: vi.fn(),
    generateMedicalCertificate: vi.fn(),
    generateExamReferral: vi.fn(),
    previewDocument: vi.fn(),
  },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { getById: vi.fn() },
}));

import { Permission } from "@/lib/permissions";

// `can` concede tudo por padrão — os testes deste arquivo focam no eixo
// `isDoctor`; a permissão Solicitações é exercida à parte, mais abaixo.
let authState: { isDoctor: boolean; can: (p: Permission) => boolean } = {
  isDoctor: true,
  can: () => true,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/services/clinical-record-template.service", () => ({
  clinicalRecordTemplateService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    apply: vi.fn(),
    delete: vi.fn(),
  },
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { clinicalRecordTemplateService } from "@/services/clinical-record-template.service";
import { healthPlanService } from "@/services/health-plan.service";
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
};

type Record_ = NonNullable<
  Parameters<typeof AtendimentoTabs>[0]["initialRecord"]
>;

/** Ficha persistida padrão; `over` sobrescreve o que o teste precisa variar. */
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
    finalizedAt: null,
    createdAt: "2026-07-29T18:00:00.000Z",
    updatedAt: "2026-07-29T18:00:00.000Z",
    ...over,
  };
}

function renderTabs(
  record: Record_ | null = null,
  over: Partial<typeof patient> = {},
) {
  return render(
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
    authState = { isDoctor: true, can: () => true };
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
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ anamnesis: "Dor lombar" }),
    );
    renderTabs();

    expect(screen.queryByText(/Alterações não salvas/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    expect(screen.getByText(/Alterações não salvas/i)).toBeInTheDocument();

    // Existem dois botões "Salvar rascunho" no DOM (versão desktop no header,
    // versão mobile no fim da aba) — jsdom não avalia media queries, então
    // ambos aparecem simultaneamente na árvore de acessibilidade, embora só um
    // fique visível por vez no navegador real. Clicamos no primeiro; os dois
    // disparam a mesma ação.
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
    (clinicalRecordService.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      existing,
    );
    renderTabs(existing);

    await user.type(screen.getByLabelText(/Queixa principal/i), " + evolução");
    // Ver comentário no teste anterior: dois botões equivalentes (desktop/mobile).
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
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      created,
    );
    // finalize() falha na primeira tentativa (rede, timeout...); persist() já
    // rodou e criou a ficha no servidor antes desse erro.
    (clinicalRecordService.finalize as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Falha de rede"),
    );
    (clinicalRecordService.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...created,
      anamnesis: "Dor lombar",
    });

    renderTabs();

    await user.type(screen.getByLabelText(/Queixa principal/i), "Dor lombar");
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    // O erro de finalize() é mostrado ao médico (getApiErrorMessage usa a
    // própria mensagem do Error quando não é um AxiosError)...
    await screen.findByText(/Falha de rede/i);
    // ...e a ficha já criada foi registrada no estado (regressão testada aqui):
    // create() só deve ter sido chamado uma vez, mesmo após a retentativa abaixo.
    expect(clinicalRecordService.create).toHaveBeenCalledTimes(1);

    // Retentativa: "Salvar rascunho" (existem duas cópias do botão no DOM —
    // desktop/mobile — ver comentário nos testes anteriores).
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
    // O ponto central da regressão: create() nunca é chamado de novo.
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
    // Texto exato (em vez de regex) para não colidir com a frase do banner de
    // aviso ("Atendimento finalizado em ..."), que também contém a palavra
    // "finalizado" e é uma correspondência legítima e distinta do badge.
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
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ surgicalIndication: true }),
    );
    renderTabs();

    await user.click(screen.getByRole("checkbox", { name: "Paciente cirúrgico" }));
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

  it("confirma a SC criada ao finalizar com o marcador ligado", async () => {
    const user = userEvent.setup();
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ surgicalIndication: true }),
    );
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

    await user.click(screen.getByRole("checkbox", { name: "Paciente cirúrgico" }));
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(/Solicitação cirúrgica criada/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Abrir solicitação/i }),
    ).toHaveAttribute("href", "/solicitacao/sc-1");
  });

  /**
   * O link para o detalhe da SC exige a permissão Solicitações — eixo
   * diferente de `isDoctor`. Sem ela, o card continua avisando que a SC foi
   * criada, mas sem um link que o guard de rota devolveria de qualquer jeito.
   */
  it("esconde o link da SC para quem não tem a permissão Solicitações", async () => {
    authState = {
      isDoctor: true,
      can: (p) => p !== Permission.SOLICITACOES,
    };
    const user = userEvent.setup();
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ surgicalIndication: true }),
    );
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

    await user.click(screen.getByRole("checkbox", { name: "Paciente cirúrgico" }));
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    expect(
      await screen.findByText(/Solicitação cirúrgica criada/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Abrir solicitação/i }),
    ).not.toBeInTheDocument();
  });

  // Quando a criação inline falha, o backend responde sem surgeryRequestId e o
  // sweeper retoma — a UI precisa dizer isso em vez de fingir que deu certo.
  it("avisa que a SC está em criação quando o backend não devolve o id", async () => {
    const user = userEvent.setup();
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture({ surgicalIndication: true }),
    );
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

    await user.click(screen.getByRole("checkbox", { name: "Paciente cirúrgico" }));
    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    // Texto exato de cada um: o toast e o aviso do card compartilham a frase
    // "está sendo criada", e uma regex casaria com os dois.
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
    (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      recordFixture(),
    );
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
    expect(screen.queryByText(/Solicitação cirúrgica/i)).not.toBeInTheDocument();
  });

  it("mantém o marcador visível e travado em ficha finalizada", () => {
    renderTabs(
      recordFixture({
        surgicalIndication: true,
        surgeryRequestId: "sc-1",
        finalizedAt: "2026-07-29T19:00:00.000Z",
      }),
    );

    expect(screen.getByRole("checkbox", { name: "Paciente cirúrgico" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Paciente cirúrgico" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
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
      // Aplicar não grava nada: o médico ainda precisa salvar.
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
      (clinicalRecordService.create as ReturnType<typeof vi.fn>).mockResolvedValue(
        recordFixture({ id: "r-nova" }),
      );
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

      await waitFor(() => expect(clinicalRecordService.create).toHaveBeenCalled());
      expect(clinicalRecordService.generatePrescription).toHaveBeenCalledWith(
        expect.objectContaining({ clinicalRecordId: "r-nova" }),
      );
    });

    it("salva as alterações pendentes antes de emitir, para o CID entrar no documento", async () => {
      const user = userEvent.setup();
      (clinicalRecordService.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        recordFixture(),
      );
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

      await waitFor(() => expect(clinicalRecordService.update).toHaveBeenCalled());
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).toHaveBeenCalledWith(expect.objectContaining({ clinicalRecordId: "r-1" }));
    });

    /**
     * D-11: pré-visualizar não pode criar ficha. Num atendimento sem ficha
     * nenhuma, "Visualizar" gravava um `ClinicalRecord` vazio — e a consulta
     * passava a ter ficha vinculada, o que impede excluí-la.
     */
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

  /**
   * D-08: o card mostrava `healthPlanType` — a acomodação (Apartamento /
   * Enfermaria) — sob o rótulo "Convênio". O nome do plano vem do cadastro de
   * convênios, resolvido pelo `healthPlanId` do paciente.
   */
  describe("card de convênio", () => {
    it("mostra o nome do convênio, não a acomodação", async () => {
      (healthPlanService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "hp-1",
        name: "Unimed Paulistana",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      });
      renderTabs(null, {
        healthPlanId: "hp-1",
        healthPlanType: "Apartamento",
      });

      expect(
        await screen.findByText("Unimed Paulistana"),
      ).toBeInTheDocument();
      expect(healthPlanService.getById).toHaveBeenCalledWith("hp-1");
      // A acomodação vira informação secundária, nunca o valor do card.
      expect(screen.getByText(/· Apartamento/)).toBeInTheDocument();
    });

    it("mostra um traço quando o paciente não tem convênio", () => {
      renderTabs(null, { healthPlanType: "Apartamento" });

      expect(healthPlanService.getById).not.toHaveBeenCalled();
      expect(screen.queryByText("Apartamento")).not.toBeInTheDocument();
    });
  });

  /**
   * D-10: a data saía de um `capitalize` de CSS, que subia a inicial de cada
   * palavra ("Quarta-Feira, 05 De Agosto Às 14:30").
   */
  it("capitaliza só a inicial da data do atendimento", () => {
    renderTabs();

    expect(
      screen.getByText(/^Quarta-feira, 29 de julho às \d{2}:\d{2}/),
    ).toBeInTheDocument();
  });

  /**
   * Atender é ato do médico. Secretária e assistente continuam entrando na
   * tela — precisam do histórico, do cadastro e dos exames anexados — mas em
   * leitura: sem salvar, sem finalizar e sem emitir documento com o CRM e a
   * assinatura do médico.
   */
  describe("usuário não-médico", () => {
    beforeEach(() => {
      authState = { isDoctor: false, can: () => true };
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
      // Em leitura a ficha troca o editor pelo conteúdo renderizado.
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
});
