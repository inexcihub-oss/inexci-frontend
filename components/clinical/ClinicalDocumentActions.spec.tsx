import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/clinical-record.service", () => ({
  clinicalRecordService: {
    generatePrescription: vi.fn(),
    generateMedicalCertificate: vi.fn(),
    generateExamReferral: vi.fn(),
    previewDocument: vi.fn(),
  },
}));

vi.mock("@/services/tuss.service", () => ({
  tussService: { searchTussFromJson: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/services/cid.service", () => ({
  cidService: { search: vi.fn().mockResolvedValue({ records: [] }) },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/services/clinical-document-template.service", () => ({
  clinicalDocumentTemplateService: {
    getAll: vi.fn().mockResolvedValue([]),
    apply: vi.fn(),
  },
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { tussService } from "@/services/tuss.service";
import { ClinicalDocumentActions } from "./ClinicalDocumentActions";
import { clinicalDocumentTemplateService } from "@/services/clinical-document-template.service";
import type { AssinanteConsulta } from "./ClinicalDocumentActions";

const generated = {
  id: "doc-1",
  name: "Receita — 30/07/2026",
  key: "prescription",
  type: "prescription",
  uri: "https://r2/receita.pdf",
  createdAt: "2026-07-30",
};

describe("ClinicalDocumentActions", () => {
  const ensureRecordId = vi.fn();
  const onEmitted = vi.fn();
  const openSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    ensureRecordId.mockResolvedValue("cr-1");
    (
      clinicalRecordService.generatePrescription as ReturnType<typeof vi.fn>
    ).mockResolvedValue(generated);
    (
      clinicalRecordService.generateMedicalCertificate as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue({ ...generated, key: "medical_certificate" });
    (
      clinicalRecordService.generateExamReferral as ReturnType<typeof vi.fn>
    ).mockResolvedValue({ ...generated, key: "exam_referral" });
    (
      clinicalRecordService.previewDocument as ReturnType<typeof vi.fn>
    ).mockResolvedValue("<html><body><h1>RECEITUÁRIO</h1></body></html>");
    vi.stubGlobal("open", openSpy);
  });

  const recordCid = { code: "M54.5", description: "Dor lombar baixa" };

  const setup = (hasCid = true, assinante: AssinanteConsulta | null = null) =>
    render(
      <ClinicalDocumentActions
        ensureRecordId={ensureRecordId}
        onEmitted={onEmitted}
        cidCodes={hasCid ? [recordCid] : []}
        patientId="p-1"
        doctorId="d-1"
        assinante={assinante}
      />,
    );

  it("oferece os três documentos do atendimento", () => {
    setup();

    expect(screen.getByRole("button", { name: /receita/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDefined();
  });

  it("consulta de profissional que não é médico não oferece nenhum dos três documentos", async () => {
    setup(true, { nome: "Luana Técnica", medico: false, semNumero: true });

    expect(
      await screen.findByText(/só podem ser emitidos por médico/),
    ).toHaveTextContent("Esta consulta é de Luana Técnica.");
    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
  });

  it("médico com CRM sem número não emite e é avisado para preencher", async () => {
    setup(true, { nome: "Karina Clínica", medico: true, semNumero: true });

    expect(
      await screen.findByText(
        /Preencha o número e a UF do CRM de Karina Clínica/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
  });

  it("consulta de dentista (CRO) emite os três documentos", async () => {
    setup(true, {
      nome: "Dra. Bia",
      medico: false,
      emiteDocumentos: true,
      conselho: "CRO",
      semNumero: false,
    });

    expect(screen.getByRole("button", { name: /receita/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /exames/i })).toBeEnabled();
    expect(screen.queryByText(/só podem ser emitidos por médico/)).toBeNull();
  });

  it("dentista sem UF no CRO é avisado para preencher", async () => {
    setup(true, {
      nome: "Dra. Bia",
      medico: false,
      emiteDocumentos: true,
      conselho: "CRO",
      semNumero: true,
    });

    expect(
      await screen.findByText(/Preencha o número e a UF do CRO de Dra. Bia/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
  });

  it("consulta de médico mantém receita e atestado", async () => {
    setup(true, { nome: "Dr. Ana", medico: true, semNumero: false });

    expect(screen.getByRole("button", { name: /receita/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeEnabled();
    expect(screen.queryByText(/só podem ser emitidos por médico/)).toBeNull();
  });

  it('expõe data-tour="ficha-documentos" no card de documentos do atendimento', () => {
    setup();

    expect(
      screen
        .getByText("Documentos do atendimento")
        .closest('[data-tour="ficha-documentos"]'),
    ).not.toBeNull();
  });

  it("emite a receita com os medicamentos digitados", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento/i), "Dipirona 500mg");
    await user.type(screen.getByLabelText(/posologia/i), "1 cp de 6/6h");
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() =>
      expect(clinicalRecordService.generatePrescription).toHaveBeenCalledWith({
        clinicalRecordId: "cr-1",
        items: [{ name: "Dipirona 500mg", instructions: "1 cp de 6/6h" }],
        notes: undefined,
      }),
    );
    expect(onEmitted).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      "https://r2/receita.pdf",
      "_blank",
      "noopener",
    );
  });

  it("garante que a ficha existe antes de emitir", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() => expect(ensureRecordId).toHaveBeenCalled());
  });

  it("não emite receita sem medicamento", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    expect(clinicalRecordService.generatePrescription).not.toHaveBeenCalled();
    expect(screen.getByText(/informe ao menos um medicamento/i)).toBeDefined();
  });

  it("permite adicionar mais de um medicamento", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento 1/i), "Dipirona");
    await user.click(
      screen.getByRole("button", { name: /adicionar medicamento/i }),
    );
    await user.type(screen.getByLabelText(/medicamento 2/i), "Omeprazol");
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() =>
      expect(clinicalRecordService.generatePrescription).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ name: "Dipirona" }, { name: "Omeprazol" }],
        }),
      ),
    );
  });

  it("emite o atestado com os dias de afastamento", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /atestado/i }));
    await user.clear(screen.getByLabelText(/dias de afastamento/i));
    await user.type(screen.getByLabelText(/dias de afastamento/i), "3");
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() =>
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ clinicalRecordId: "cr-1", restDays: 3 }),
      ),
    );
  });

  it("oferece incluir o CID mesmo quando a ficha não tem diagnóstico", async () => {
    const user = userEvent.setup();
    setup(false);

    await user.click(screen.getByRole("button", { name: /atestado/i }));
    await user.click(screen.getByLabelText(/incluir cid/i));

    expect(screen.getByPlaceholderText(/buscar cid/i)).toBeDefined();
  });

  it("emite o encaminhamento com os exames solicitados", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /exames/i }));
    await user.type(screen.getByLabelText(/exame 1/i), "Hemograma completo");
    await user.type(
      screen.getByLabelText(/indicação clínica/i),
      "Anemia a esclarecer",
    );
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() =>
      expect(clinicalRecordService.generateExamReferral).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicalRecordId: "cr-1",
          exams: [{ name: "Hemograma completo" }],
          clinicalIndication: "Anemia a esclarecer",
        }),
      ),
    );
  });

  it("mostra o erro do servidor sem fechar o modal", async () => {
    const user = userEvent.setup();
    (
      clinicalRecordService.generatePrescription as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Assinatura do médico não configurada"));
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
    await user.click(screen.getByRole("button", { name: /emitir/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Assinatura do médico não configurada",
      ),
    );
    expect(screen.getByLabelText(/medicamento/i)).toBeDefined();
    expect(onEmitted).not.toHaveBeenCalled();
  });

  describe("pré-visualização", () => {
    it("abre a prévia sem gravar a ficha nem emitir", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      await waitFor(() =>
        expect(clinicalRecordService.previewDocument).toHaveBeenCalledWith(
          "prescription",
          {
            patientId: "p-1",
            doctorId: "d-1",
            items: [{ name: "Dipirona" }],
            notes: undefined,
          },
        ),
      );
      expect(ensureRecordId).not.toHaveBeenCalled();
      expect(clinicalRecordService.generatePrescription).not.toHaveBeenCalled();
      expect(onEmitted).not.toHaveBeenCalled();
      expect(await screen.findByTestId("document-preview")).toBeDefined();
    });

    it("leva os CIDs da ficha em memória na prévia do encaminhamento", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /exames/i }));
      await user.type(screen.getByLabelText(/exame 1/i), "Hemograma");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      await waitFor(() =>
        expect(clinicalRecordService.previewDocument).toHaveBeenCalledWith(
          "exam-referral",
          expect.objectContaining({
            patientId: "p-1",
            doctorId: "d-1",
            cidCodes: [recordCid],
          }),
        ),
      );
      expect(ensureRecordId).not.toHaveBeenCalled();
    });

    it("ainda persiste a ficha ao emitir a partir da prévia", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      const emitir = await screen
        .findByTestId("document-preview")
        .then(() => screen.getAllByRole("button", { name: /emitir/i }));
      await user.click(emitir[emitir.length - 1]);

      await waitFor(() => expect(ensureRecordId).toHaveBeenCalled());
      expect(clinicalRecordService.generatePrescription).toHaveBeenCalledWith(
        expect.objectContaining({ clinicalRecordId: "cr-1" }),
      );
    });

    it("não pré-visualiza receita sem medicamento", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      expect(clinicalRecordService.previewDocument).not.toHaveBeenCalled();
      expect(
        screen.getByText(/informe ao menos um medicamento/i),
      ).toBeDefined();
    });

    it("mostra o erro quando a prévia falha", async () => {
      const user = userEvent.setup();
      (
        clinicalRecordService.previewDocument as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Falha ao gerar a prévia"));
      setup();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert").textContent).toContain(
          "Falha ao gerar a prévia",
        ),
      );
    });
  });

  describe("atestado com CID", () => {
    it("envia o CID escolhido no atestado", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.click(screen.getByLabelText(/incluir cid/i));

      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            cid: { code: "M54.5", description: "Dor lombar baixa" },
          }),
        ),
      );
    });

    it("não envia CID quando o médico não marca a inclusão", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalledWith(expect.objectContaining({ cid: undefined })),
      );
    });
  });

  describe("código TUSS dos exames", () => {
    it("usa a busca do catálogo em vez de digitação livre do código", async () => {
      const user = userEvent.setup();
      (
        tussService.searchTussFromJson as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        {
          id: "1",
          tussCode: "4.03.01.01-9",
          name: "Hemograma completo",
          active: true,
        },
      ]);
      setup();

      await user.click(screen.getByRole("button", { name: /exames/i }));
      await user.type(screen.getByLabelText(/código tuss/i), "hemo");
      await user.click(await screen.findByText("Hemograma completo"));

      expect(
        (screen.getByLabelText(/exame 1/i) as HTMLInputElement).value,
      ).toBe("Hemograma completo");

      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.generateExamReferral).toHaveBeenCalledWith(
          expect.objectContaining({
            exams: [{ name: "Hemograma completo", tussCode: "4.03.01.01-9" }],
          }),
        ),
      );
    });
  });

  it("não fecha o modal ao digitar espaço no meio do texto", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento/i), "Dipirona 500mg");

    expect(screen.getByLabelText(/posologia/i)).toBeDefined();
    expect(
      (screen.getByLabelText(/medicamento/i) as HTMLInputElement).value,
    ).toBe("Dipirona 500mg");
  });

  it("desabilita o botão Emitir durante o tour", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento 1/i), "Dipirona 500mg");

    expect(screen.getByRole("button", { name: /^emitir$/i })).toBeDisabled();
  });

  it("desabilita o botão Visualizar durante o tour", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    render(
      <ClinicalDocumentActions
        ensureRecordId={vi.fn().mockResolvedValue("record-1")}
        onEmitted={vi.fn()}
        cidCodes={[]}
        patientId="pac-1"
        doctorId="doctor-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: /receita/i }));

    expect(screen.getByRole("button", { name: /visualizar/i })).toBeDisabled();
  });

  it("desabilita o Emitir mesmo fora do tour, quando dadosFabricados é true", async () => {
    const user = userEvent.setup();
    render(
      <ClinicalDocumentActions
        ensureRecordId={vi.fn().mockResolvedValue("record-1")}
        onEmitted={vi.fn()}
        cidCodes={[]}
        patientId="pac-1"
        doctorId="doctor-1"
        dadosFabricados
      />,
    );

    await user.click(screen.getByRole("button", { name: /receita/i }));
    await user.type(screen.getByLabelText(/medicamento 1/i), "Dipirona");

    expect(onboardingMockState.emTour).toBe(false);
    expect(screen.getByRole("button", { name: /^emitir$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /visualizar/i })).toBeDisabled();
  });

  describe("modelos de texto (MIG-06)", () => {
    const templates = clinicalDocumentTemplateService as unknown as {
      getAll: ReturnType<typeof vi.fn>;
      apply: ReturnType<typeof vi.fn>;
    };
    const modelo = {
      id: "tpl-1",
      doctorId: "d-1",
      kind: "medical_certificate",
      name: "Atestado padrão",
      body: "Atesto {{paciente.nome}}",
      usageCount: 0,
      createdAt: "",
      updatedAt: "",
    };

    beforeEach(() => {
      templates.getAll.mockReset().mockResolvedValue([]);
      templates.apply.mockReset();
    });

    it("sem modelos, o atestado não mostra o seletor, só o atalho para criar", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: /atestado/i }));

      await waitFor(() =>
        expect(templates.getAll).toHaveBeenCalledWith({
          kind: "medical_certificate",
          doctorId: "d-1",
        }),
      );
      expect(screen.queryByLabelText("Usar modelo")).toBeNull();
      expect(
        screen.getByRole("link", { name: "Criar modelo de texto" }),
      ).toHaveAttribute("href", "/configuracoes?tab=document-templates");
    });

    it("aplicar o modelo preenche o texto do atestado — não as observações — e o seletor mostra o escolhido", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto Maria Silva por 1 dia.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));

      const select = await screen.findByLabelText("Usar modelo");
      await user.selectOptions(select, "tpl-1");

      expect(templates.apply).toHaveBeenCalledWith("tpl-1", {
        patientId: "p-1",
        doctorId: "d-1",
      });
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue("Atesto Maria Silva por 1 dia."),
      );
      expect(select).toHaveValue("tpl-1");
      expect(screen.getByLabelText("Observações")).toHaveValue("");

      await user.type(texto, " Repouso.");
      await user.type(
        screen.getByLabelText("Observações"),
        "Retorno em 7 dias",
      );
      await user.click(screen.getByRole("button", { name: /^emitir/i }));

      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            text: "Atesto Maria Silva por 1 dia. Repouso.",
            observations: "Retorno em 7 dias",
          }),
        ),
      );
    });

    it("'Usar texto padrão' descarta o texto do modelo e volta o seletor para Nenhum", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto Maria Silva por 1 dia.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      const select = await screen.findByLabelText("Usar modelo");
      await user.selectOptions(select, "tpl-1");
      await screen.findByLabelText("Texto do atestado");

      await user.click(
        screen.getByRole("button", { name: "Usar texto padrão" }),
      );

      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
      expect(select).toHaveValue("");
      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalledWith(expect.objectContaining({ text: undefined })),
      );
    });

    it("texto do modelo editado mantém {{dias}}/{{inicio}} e sai com os dias escolhidos depois", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Afastamento de {{dias}} dias a partir de {{inicio}}.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue(
          "Afastamento de {{dias}} dias a partir de {{inicio}}.",
        ),
      );
      expect(
        screen.getByText(/são preenchidos ao visualizar e ao emitir/),
      ).toBeInTheDocument();

      await user.type(texto, " Repouso.");
      const dias = screen.getByLabelText("Dias de afastamento");
      await user.clear(dias);
      await user.type(dias, "3");
      await new Promise((r) => setTimeout(r, 450));
      expect(templates.apply).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalled(),
      );
      const payload = vi.mocked(
        clinicalRecordService.generateMedicalCertificate,
      ).mock.calls[0][0];
      expect(payload).toMatchObject({
        restDays: 3,
        text: "Afastamento de {{dias}} dias a partir de {{inicio}}. Repouso.",
      });
    });

    it("modelo de comparecimento zera os dias de afastamento", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Declaro que Maria Silva compareceu a esta consulta das 14h às 15h.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(screen.getByLabelText("Dias de afastamento")).toHaveValue(null),
      );

      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalled(),
      );
      expect(
        vi.mocked(clinicalRecordService.generateMedicalCertificate).mock
          .calls[0][0],
      ).toMatchObject({ restDays: undefined });
    });

    it("'Usar texto padrão' com o modelo ainda aplicando não deixa o texto voltar", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      let liberar: () => void = () => undefined;
      templates.apply.mockImplementation(
        () =>
          new Promise((resolve) => {
            liberar = () =>
              resolve({
                id: "tpl-1",
                kind: "medical_certificate",
                body: "Atesto Maria Silva por 1 dia.",
              });
          }),
      );
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      const select = await screen.findByLabelText("Usar modelo");
      await user.selectOptions(select, "tpl-1");
      await user.click(
        screen.getByRole("button", { name: "Usar texto padrão" }),
      );

      liberar();
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
      expect(select).toHaveValue("");
    });

    it("texto do modelo intacto sai pelo templateId, com os dias escolhidos", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Afastamento de {{dias}} dias.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue("Afastamento de {{dias}} dias."),
      );

      const dias = screen.getByLabelText("Dias de afastamento");
      await user.clear(dias);
      await user.type(dias, "5");

      const emitir = screen.getByRole("button", { name: /^emitir/i });
      expect(emitir).toBeEnabled();
      await user.click(emitir);

      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalled(),
      );
      const payload = vi.mocked(
        clinicalRecordService.generateMedicalCertificate,
      ).mock.calls[0][0];
      expect(payload).toMatchObject({ templateId: "tpl-1", restDays: 5 });
      expect(payload).not.toHaveProperty("text");
    });

    it("a prévia do texto do modelo intacto também vai pelo templateId", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto Maria Silva por 1 dia.",
      });
      vi.mocked(clinicalRecordService.previewDocument).mockResolvedValue(
        "<p>prévia</p>",
      );
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Texto do atestado")).toHaveValue(
          "Atesto Maria Silva por 1 dia.",
        ),
      );

      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      await waitFor(() =>
        expect(clinicalRecordService.previewDocument).toHaveBeenCalled(),
      );
      const [kind, payload] = vi.mocked(clinicalRecordService.previewDocument)
        .mock.calls[0];
      expect(kind).toBe("medical-certificate");
      expect(payload).toMatchObject({ templateId: "tpl-1", restDays: 1 });
      expect(payload).not.toHaveProperty("text");
    });

    it("texto do modelo editado sai como texto, sem templateId", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto Maria Silva por 1 dia.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue("Atesto Maria Silva por 1 dia."),
      );
      await user.type(texto, " Repouso.");

      const dias = screen.getByLabelText("Dias de afastamento");
      await user.clear(dias);
      await user.type(dias, "2");
      await new Promise((r) => setTimeout(r, 450));
      expect(templates.apply).toHaveBeenCalledTimes(1);
      expect(texto).toHaveValue("Atesto Maria Silva por 1 dia. Repouso.");

      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await waitFor(() =>
        expect(
          clinicalRecordService.generateMedicalCertificate,
        ).toHaveBeenCalled(),
      );
      const payload = vi.mocked(
        clinicalRecordService.generateMedicalCertificate,
      ).mock.calls[0][0];
      expect(payload).toMatchObject({
        text: "Atesto Maria Silva por 1 dia. Repouso.",
      });
      expect(payload).not.toHaveProperty("templateId");
    });

    it("o texto do atestado tem o limite do servidor e mostra a contagem", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      const texto = await screen.findByLabelText("Texto do atestado");

      expect(texto).toHaveAttribute("maxLength", "4000");
      expect(await screen.findByText("7/4000")).toBeInTheDocument();
    });

    it("o atalho para os modelos tem alvo de toque de 44px no celular", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      expect(
        screen.getByRole("link", { name: "Criar modelo de texto" }),
      ).toHaveClass("min-h-[44px]");
    });

    it("modelo pedido num modal fechado não cai no próximo", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      let liberar: () => void = () => undefined;
      templates.apply.mockImplementation(
        () =>
          new Promise((resolve) => {
            liberar = () =>
              resolve({
                id: "tpl-1",
                kind: "medical_certificate",
                body: "Atesto Maria Silva por 1 dia.",
              });
          }),
      );
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      const select = await screen.findByLabelText("Usar modelo");

      liberar();
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
      expect(select).toHaveValue("");
      expect(select).toBeEnabled();
    });

    it("digitar com o modelo ainda aplicando devolve o seletor ao que está no texto", async () => {
      templates.getAll.mockResolvedValue([
        { ...modelo, id: "tpl-2", kind: "exam_referral", name: "RM" },
      ]);
      let liberar: () => void = () => undefined;
      templates.apply.mockImplementation(
        () =>
          new Promise((resolve) => {
            liberar = () =>
              resolve({
                id: "tpl-2",
                kind: "exam_referral",
                body: "Modelo RM",
              });
          }),
      );
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /exames/i }));
      const select = await screen.findByLabelText("Usar modelo");
      await user.selectOptions(select, "tpl-2");
      await user.type(screen.getByLabelText("Indicação clínica"), "Dor");

      liberar();
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByLabelText("Indicação clínica")).toHaveValue("Dor");
      expect(select).toHaveValue("");
    });

    it("voltar ao texto padrão pede confirmação quando o texto foi editado", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Atesto Maria Silva por 1 dia.",
      });
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue("Atesto Maria Silva por 1 dia."),
      );
      await user.type(texto, " Repouso.");

      await user.click(
        screen.getByRole("button", { name: "Usar texto padrão" }),
      );
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(texto).toHaveValue("Atesto Maria Silva por 1 dia. Repouso.");

      confirmSpy.mockReturnValueOnce(true);
      await user.click(
        screen.getByRole("button", { name: "Usar texto padrão" }),
      );
      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
      confirmSpy.mockRestore();
    });

    it("no pedido de exame o modelo preenche a indicação clínica", async () => {
      templates.getAll.mockResolvedValue([
        { ...modelo, id: "tpl-2", kind: "exam_referral", name: "RM" },
      ]);
      templates.apply.mockResolvedValue({
        id: "tpl-2",
        kind: "exam_referral",
        body: "Investigar lesão.",
      });
      const user = userEvent.setup();
      setup();
      await user.click(
        screen.getByRole("button", { name: /solicitar exames/i }),
      );

      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-2",
      );

      expect(templates.getAll).toHaveBeenCalledWith({
        kind: "exam_referral",
        doctorId: "d-1",
      });
      expect(templates.apply).toHaveBeenCalledWith("tpl-2", {
        patientId: "p-1",
        doctorId: "d-1",
      });
      await waitFor(() =>
        expect(screen.getByLabelText("Indicação clínica")).toHaveValue(
          "Investigar lesão.",
        ),
      );
      expect(screen.getByLabelText("Usar modelo")).toHaveValue("tpl-2");
      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
    });

    it("a receita não busca modelos", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: /receita/i }));
      expect(templates.getAll).not.toHaveBeenCalled();
      expect(screen.queryByText("Criar modelo de texto")).toBeNull();
    });

    it("falha ao aplicar mostra o erro e não apaga o texto", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockRejectedValue({});
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.type(screen.getByLabelText("Observações"), "meu texto");

      await user.selectOptions(
        await screen.findByLabelText("Usar modelo"),
        "tpl-1",
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível aplicar o modelo.",
      );
      expect(screen.getByLabelText("Observações")).toHaveValue("meu texto");
    });

    const selecionarModelo = async (
      user: ReturnType<typeof userEvent.setup>,
      id: string,
    ) => user.selectOptions(await screen.findByLabelText("Usar modelo"), id);

    it("texto com {{dias}} e dias vazios não envia e explica no formulário", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Afastamento de {{dias}} dias.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await selecionarModelo(user, "tpl-1");
      await waitFor(() =>
        expect(screen.getByLabelText("Texto do atestado")).toHaveValue(
          "Afastamento de {{dias}} dias.",
        ),
      );
      await user.clear(screen.getByLabelText("Dias de afastamento"));

      expect(
        screen.getByText("O texto usa {{dias}}: informe os dias."),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      expect(
        await screen.findByText(
          "O texto usa {{dias}}: informe os dias de afastamento ou tire {{dias}} do texto.",
        ),
      ).toBeInTheDocument();
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).not.toHaveBeenCalled();
      expect(clinicalRecordService.previewDocument).not.toHaveBeenCalled();
      expect(ensureRecordId).not.toHaveBeenCalled();
    });

    it("texto com {{inicio}} sem dias nem data não envia", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockResolvedValue({
        id: "tpl-1",
        kind: "medical_certificate",
        body: "Compareceu e retorna em {{inicio}}.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await selecionarModelo(user, "tpl-1");
      await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(screen.getByLabelText("Dias de afastamento")).toHaveValue(null),
      );

      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "O texto usa {{inicio}}",
      );
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).not.toHaveBeenCalled();
    });

    it("dias zerados pelo comparecimento voltam para 1 ao trocar para um modelo de afastamento", async () => {
      const afastamento = { ...modelo, id: "tpl-2", name: "Afastamento" };
      templates.getAll.mockResolvedValue([modelo, afastamento]);
      templates.apply.mockImplementation(async (id: string) =>
        id === "tpl-1"
          ? {
              id,
              kind: "medical_certificate",
              body: "Declaro que Maria compareceu a esta consulta.",
            }
          : {
              id,
              kind: "medical_certificate",
              body: "Afastamento de {{dias}} dias.",
            },
      );
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await selecionarModelo(user, "tpl-1");
      await waitFor(() =>
        expect(screen.getByLabelText("Dias de afastamento")).toHaveValue(null),
      );

      await selecionarModelo(user, "tpl-2");
      await waitFor(() =>
        expect(screen.getByLabelText("Texto do atestado")).toHaveValue(
          "Afastamento de {{dias}} dias.",
        ),
      );
      expect(screen.getByLabelText("Dias de afastamento")).toHaveValue(1);
    });

    it("dias apagados pelo próprio médico não voltam sozinhos", async () => {
      const afastamento = { ...modelo, id: "tpl-2", name: "Afastamento" };
      templates.getAll.mockResolvedValue([modelo, afastamento]);
      templates.apply.mockResolvedValue({
        id: "tpl-2",
        kind: "medical_certificate",
        body: "Atesto Maria.",
      });
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.clear(screen.getByLabelText("Dias de afastamento"));
      await selecionarModelo(user, "tpl-2");
      await waitFor(() =>
        expect(screen.getByLabelText("Texto do atestado")).toHaveValue(
          "Atesto Maria.",
        ),
      );
      expect(screen.getByLabelText("Dias de afastamento")).toHaveValue(null);
    });
  });

  it("atestado com 0 dias sai como comparecimento, sem restDays", async () => {
    const user = userEvent.setup();
    setup(false);
    await user.click(screen.getByRole("button", { name: /atestado/i }));
    const dias = screen.getByLabelText("Dias de afastamento");
    expect(dias).toHaveAttribute("min", "0");
    await user.clear(dias);
    await user.type(dias, "0");
    await user.click(screen.getByRole("button", { name: /^emitir/i }));

    await waitFor(() =>
      expect(
        clinicalRecordService.generateMedicalCertificate,
      ).toHaveBeenCalled(),
    );
    expect(
      vi.mocked(clinicalRecordService.generateMedicalCertificate).mock
        .calls[0][0],
    ).not.toHaveProperty("restDays", expect.anything());
  });

  describe("quem não é o profissional da consulta", () => {
    const setupOutro = () =>
      render(
        <ClinicalDocumentActions
          ensureRecordId={ensureRecordId}
          onEmitted={onEmitted}
          cidCodes={[]}
          patientId="p-1"
          doctorId="d-1"
          profissionalDaConsulta={false}
        />,
      );

    it("vê os três documentos desabilitados, com o aviso", () => {
      setupOutro();

      expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
      expect(
        screen.getByText(
          "Só o profissional da consulta pode emitir documentos.",
        ),
      ).toBeInTheDocument();
    });

    it("não mostra o aviso de conselho no lugar do aviso de profissional", () => {
      render(
        <ClinicalDocumentActions
          ensureRecordId={ensureRecordId}
          onEmitted={onEmitted}
          cidCodes={[]}
          patientId="p-1"
          doctorId="d-1"
          profissionalDaConsulta={false}
          assinante={{ nome: "Karina Clínica", medico: true, semNumero: true }}
        />,
      );

      expect(screen.queryByText(/Preencha o número/)).toBeNull();
      expect(
        screen.getByText(
          "Só o profissional da consulta pode emitir documentos.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("o profissional da consulta vê o atalho para criar modelo", async () => {
    vi.mocked(clinicalDocumentTemplateService.getAll).mockResolvedValue([]);
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /atestado/i }));
    expect(
      await screen.findByRole("link", { name: "Criar modelo de texto" }),
    ).toHaveAttribute("href", "/configuracoes?tab=document-templates");
  });
});
