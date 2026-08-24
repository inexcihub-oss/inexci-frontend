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
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { clinicalRecordService } from "@/services/clinical-record.service";
import { tussService } from "@/services/tuss.service";
import { ClinicalDocumentActions } from "./ClinicalDocumentActions";

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
});
