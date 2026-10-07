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

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { tussService } from "@/services/tuss.service";
import { ClinicalDocumentActions } from "./ClinicalDocumentActions";
import { clinicalDocumentTemplateService } from "@/services/clinical-document-template.service";
import { availableDoctorsService } from "@/services/available-doctors.service";

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

  const setup = (hasCid = true) =>
    render(
      <ClinicalDocumentActions
        ensureRecordId={ensureRecordId}
        onEmitted={onEmitted}
        cidCodes={hasCid ? [recordCid] : []}
        patientId="p-1"
        doctorId="d-1"
      />,
    );

  it("oferece os três documentos do atendimento", () => {
    setup();

    expect(screen.getByRole("button", { name: /receita/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDefined();
  });

  it("consulta de profissional que não é médico não oferece nenhum dos três documentos", async () => {
    (
      availableDoctorsService.getAvailableDoctors as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      {
        id: "d-1",
        name: "Luana Técnica",
        crm: null,
        crmState: null,
        isPhysician: false,
      },
    ]);
    setup();

    expect(
      await screen.findByText(/só podem ser emitidos por médico/),
    ).toHaveTextContent("Esta consulta é de Luana Técnica.");
    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
    // Pedido de exame também: o backend exige médico nos três documentos.
    expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
  });

  it("médico com CRM sem número não emite e é avisado para preencher", async () => {
    (
      availableDoctorsService.getAvailableDoctors as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      { id: "d-1", name: "Karina Clínica", crm: null, crmState: null, isPhysician: true },
    ]);
    setup();

    expect(
      await screen.findByText(/Preencha o número do CRM de Karina Clínica/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /receita/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /exames/i })).toBeDisabled();
  });

  it("consulta de médico mantém receita e atestado", async () => {
    (
      availableDoctorsService.getAvailableDoctors as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce([
      { id: "d-1", name: "Dr. Ana", crm: "1", crmState: "RJ", isPhysician: true },
    ]);
    setup();

    await waitFor(() =>
      expect(availableDoctorsService.getAvailableDoctors).toHaveBeenCalled(),
    );
    expect(screen.getByRole("button", { name: /receita/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /atestado/i })).toBeEnabled();
    expect(screen.queryByText(/só podem ser emitidos por médico/)).toBeNull();
  });

  /**
   * Âncora do tour de onboarding (trilha "atendimento", passo "documentos")
   * em `lib/onboarding/tour-registry.ts`. Sem este teste, remover o atributo
   * (ou trocar o elemento) quebra o tour em silêncio.
   */
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
    await user.type(
      screen.getByLabelText(/medicamento/i),
      "Dipirona 500mg",
    );
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

  // O CID do atestado nem sempre é o da ficha (e a ficha pode não ter CID
  // nenhum), então a opção existe sempre — quem escolhe é o médico.
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
    // O modal continua aberto com o que já foi digitado.
    expect(screen.getByLabelText(/medicamento/i)).toBeDefined();
    expect(onEmitted).not.toHaveBeenCalled();
  });

  describe("pré-visualização", () => {
    /**
     * D-11: a prévia chamava `ensureRecordId()` e, num atendimento ainda não
     * salvo, criava uma ficha vazia no prontuário — enquanto o banner dizia
     * que nada tinha sido salvo. Visualizar manda o paciente e a ficha em
     * memória; a ficha só é gravada em "Emitir".
     */
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
      // Conferir não pode registrar nada no prontuário — nem a ficha.
      expect(ensureRecordId).not.toHaveBeenCalled();
      expect(clinicalRecordService.generatePrescription).not.toHaveBeenCalled();
      expect(onEmitted).not.toHaveBeenCalled();
      expect(await screen.findByTestId("document-preview")).toBeDefined();
    });

    // O pedido de exame imprime a hipótese diagnóstica da ficha; sem os CIDs em
    // memória, a prévia sairia diferente do documento emitido logo depois.
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

    // Emitir continua persistindo a ficha antes — o documento é registro do
    // atendimento e sai da ficha gravada.
    it("ainda persiste a ficha ao emitir a partir da prévia", async () => {
      const user = userEvent.setup();
      setup();

      await user.click(screen.getByRole("button", { name: /receita/i }));
      await user.type(screen.getByLabelText(/medicamento/i), "Dipirona");
      await user.click(screen.getByRole("button", { name: /visualizar/i }));

      const emitir = await screen.findByTestId("document-preview").then(() =>
        screen.getAllByRole("button", { name: /emitir/i }),
      );
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
      expect(screen.getByText(/informe ao menos um medicamento/i)).toBeDefined();
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

      // O CID da ficha entra como sugestão inicial e é o que vai no documento.
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

      // Escolher no catálogo já nomeia o exame, sem redigitar.
      expect(
        (screen.getByLabelText(/exame 1/i) as HTMLInputElement).value,
      ).toBe("Hemograma completo");

      await user.click(screen.getByRole("button", { name: /emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.generateExamReferral).toHaveBeenCalledWith(
          expect.objectContaining({
            exams: [
              { name: "Hemograma completo", tussCode: "4.03.01.01-9" },
            ],
          }),
        ),
      );
    });
  });

  // Regressão: o efeito de foco do Modal dependia da identidade de `onClose`,
  // que muda a cada render. Digitar um espaço devolvia o foco ao botão de
  // fechar e o próprio espaço o acionava, fechando o modal no meio do
  // preenchimento.
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
    await user.type(
      screen.getByLabelText(/medicamento 1/i),
      "Dipirona 500mg",
    );

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

    expect(
      screen.getByRole("button", { name: /visualizar/i }),
    ).toBeDisabled();
  });

  /**
   * Guard por PROVENIÊNCIA: o pai passa `dadosFabricados` quando o
   * atendimento em tela é o fabricado do tour. Sair do tour (`emTour: false`)
   * não pode reabilitar a emissão real.
   */
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
        restDays: 1,
      });
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() =>
        expect(texto).toHaveValue("Atesto Maria Silva por 1 dia."),
      );
      // Antes o seletor voltava a "Escolha um modelo" e parecia não ter
      // escolhido nada.
      expect(select).toHaveValue("tpl-1");
      expect(screen.getByLabelText("Observações")).toHaveValue("");

      await user.type(texto, " Repouso.");
      await user.type(screen.getByLabelText("Observações"), "Retorno em 7 dias");
      await user.click(screen.getByRole("button", { name: /^emitir/i }));

      await waitFor(() =>
        expect(clinicalRecordService.generateMedicalCertificate).toHaveBeenCalledWith(
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

      await user.click(screen.getByRole("button", { name: "Usar texto padrão" }));

      expect(screen.queryByLabelText("Texto do atestado")).toBeNull();
      expect(select).toHaveValue("");
      await user.click(screen.getByRole("button", { name: /^emitir/i }));
      await waitFor(() =>
        expect(clinicalRecordService.generateMedicalCertificate).toHaveBeenCalledWith(
          expect.objectContaining({ text: undefined }),
        ),
      );
    });

    it("mudar os dias depois do modelo refaz o texto com os dias novos", async () => {
      templates.getAll.mockResolvedValue([modelo]);
      templates.apply.mockImplementation(async (_id, body) => ({
        id: "tpl-1",
        kind: "medical_certificate",
        body: `Afastamento de ${body.restDays} dias.`,
      }));
      const user = userEvent.setup();
      setup(false);
      await user.click(screen.getByRole("button", { name: /atestado/i }));
      await user.selectOptions(await screen.findByLabelText("Usar modelo"), "tpl-1");
      const texto = await screen.findByLabelText("Texto do atestado");
      await waitFor(() => expect(texto).toHaveValue("Afastamento de 1 dias."));

      const dias = screen.getByLabelText("Dias de afastamento");
      await user.clear(dias);
      await user.type(dias, "3");

      await waitFor(() => expect(texto).toHaveValue("Afastamento de 3 dias."));
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
      await user.click(screen.getByRole("button", { name: /solicitar exames/i }));

      await user.selectOptions(await screen.findByLabelText("Usar modelo"), "tpl-2");

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
      // O seletor continua mostrando o modelo escolhido.
      expect(screen.getByLabelText("Usar modelo")).toHaveValue("tpl-2");
      // Pedido de exame não tem "texto do atestado".
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

      await user.selectOptions(await screen.findByLabelText("Usar modelo"), "tpl-1");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Não foi possível aplicar o modelo.",
      );
      expect(screen.getByLabelText("Observações")).toHaveValue("meu texto");
    });
  });
});
