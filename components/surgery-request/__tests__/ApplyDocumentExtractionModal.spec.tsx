import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApplyDocumentExtractionModal } from "../ApplyDocumentExtractionModal";
import { surgeryRequestService, SurgeryRequestDetail } from "@/services/surgery-request.service";
import { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import { SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY } from "@/lib/sc-from-document-background";

vi.mock("@/services/surgery-request.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/surgery-request.service")
  >("@/services/surgery-request.service");
  return {
    ...actual,
    surgeryRequestService: {
      extractFromDocument: vi.fn(),
      getExtractFromDocumentStatus: vi.fn(),
      applyDocumentExtraction: vi.fn(),
    },
  };
});

const solicitation = {
  id: 123,
  procedure: null,
  hospital: null,
  healthPlan: null,
  healthPlanRegistration: null,
  sections: [],
  tussItems: [],
  opmeItems: [],
} as unknown as SurgeryRequestDetail;

const extractionResult: ExtractFromDocumentResponse = {
  kind: "medical_report",
  confidence: 0.9,
  extracted: { hospital: "Hospital X" },
  suggestedDocumentType: "medical_report",
  patientCpfMissing: false,
  patientMatchedByCpf: false,
  candidates: { patient: [], hospital: [], healthPlan: [], procedure: [] },
  tempStoragePath: "tmp/doc.pdf",
};

function selectFile(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  const file = new File(["pdf-content"], "laudo.pdf", {
    type: "application/pdf",
  });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("ApplyDocumentExtractionModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(surgeryRequestService.extractFromDocument).mockResolvedValue({
      jobId: "job-1",
      status: "processing",
    });
  });

  it("permite fechar o modal durante a análise sem suprimir a notificação de conclusão", async () => {
    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus).mockImplementation(
      () => new Promise(() => {}), // nunca resolve — mantém "analyzing" true
    );

    const { container } = render(
      <ApplyDocumentExtractionModal
        isOpen
        onClose={onClose}
        solicitation={solicitation}
        onSuccess={onSuccess}
      />,
    );

    selectFile(container);
    fireEvent.click(screen.getByRole("button", { name: "Analisar documento" }));

    await waitFor(() => {
      expect(surgeryRequestService.extractFromDocument).toHaveBeenCalled();
    });

    expect(surgeryRequestService.extractFromDocument).toHaveBeenCalledWith(
      expect.any(File),
      { surgeryRequestId: 123 },
    );

    await waitFor(() => {
      expect(screen.getByText("Analisando documento")).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole("button", { name: "Fechar" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      localStorage.getItem(SC_FROM_DOCUMENT_EXTRACTION_FOREGROUND_KEY),
    ).toBeNull();
  });

  it("abre diretamente na etapa de revisão quando initialResult é fornecido", () => {
    render(
      <ApplyDocumentExtractionModal
        isOpen
        onClose={onClose}
        solicitation={solicitation}
        onSuccess={onSuccess}
        initialResult={extractionResult}
      />,
    );

    expect(
      screen.getByText("Revise os dados antes de adicionar"),
    ).toBeInTheDocument();
    expect(surgeryRequestService.extractFromDocument).not.toHaveBeenCalled();
  });
});
