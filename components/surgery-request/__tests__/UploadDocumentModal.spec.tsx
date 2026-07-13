import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadDocumentModal } from "../UploadDocumentModal";
import { surgeryRequestService } from "@/services/surgery-request.service";

const socketHandlers: Record<
  string,
  ((payload?: unknown) => void) | undefined
> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    socketHandlers[event] = handler;
    return mockSocket;
  }),
  off: vi.fn((event: string) => {
    delete socketHandlers[event];
    return mockSocket;
  }),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    extractFromDocument: vi.fn(),
    getExtractFromDocumentStatus: vi.fn(),
  },
}));

vi.mock("@/lib/sc-from-document-prefetch", () => ({
  prefetchScFromDocumentCatalogs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth-token", () => ({
  getAccessToken: vi.fn(() => "token-test"),
}));

describe("UploadDocumentModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key]);
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:3002";
    vi.mocked(surgeryRequestService.extractFromDocument).mockResolvedValue({
      jobId: "job-1",
      status: "processing",
    });
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  });

  function selectFile(container: HTMLElement) {
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["pdf-content"], "laudo.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [file] } });
  }

  it("conclui análise quando o status inicial já vem como done", async () => {
    vi.mocked(
      surgeryRequestService.getExtractFromDocumentStatus,
    ).mockResolvedValueOnce({
      status: "done",
      result: {
        kind: "medical_report",
        confidence: 0.9,
        extracted: {},
        suggestedDocumentType: "medical_report",
        patientCpfMissing: false,
        patientMatchedByCpf: false,
        candidates: {
          patient: [],
          hospital: [],
          healthPlan: [],
          procedure: [],
        },
        tempStoragePath: "tmp/doc.pdf",
      },
    });

    const { container } = render(
      <UploadDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    selectFile(container);
    fireEvent.click(screen.getByRole("button", { name: "Analisar documento" }));

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 },
    );
  });

  it("exibe erro quando job retorna status error", async () => {
    vi.mocked(
      surgeryRequestService.getExtractFromDocumentStatus,
    ).mockResolvedValueOnce({
      status: "error",
      message: "Falha no OCR",
    });

    const { container } = render(
      <UploadDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    selectFile(container);
    fireEvent.click(screen.getByRole("button", { name: "Analisar documento" }));

    await waitFor(() => {
      expect(screen.getByText("Falha no OCR")).toBeInTheDocument();
    });
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("permite fechar o modal durante a análise", async () => {
    const onBackgroundProcessingStart = vi.fn();

    vi.mocked(surgeryRequestService.getExtractFromDocumentStatus)
      .mockResolvedValueOnce({ status: "processing" })
      .mockResolvedValueOnce({ status: "processing" });

    const { container } = render(
      <UploadDocumentModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        onBackgroundProcessingStart={onBackgroundProcessingStart}
      />,
    );

    selectFile(container);
    fireEvent.click(screen.getByRole("button", { name: "Analisar documento" }));

    await waitFor(() => {
      expect(screen.getByText("Análise em andamento")).toBeInTheDocument();
    });

    const closeButtons = screen.getAllByRole("button", { name: "Fechar" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onBackgroundProcessingStart).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "laudo.pdf",
        jobId: "job-1",
      }),
    );
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
