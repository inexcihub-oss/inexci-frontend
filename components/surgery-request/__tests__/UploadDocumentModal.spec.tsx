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

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

const onboardingActions: Record<string, () => void> = {};
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: (id: string, fn: () => void) => {
    onboardingActions[id] = fn;
  },
}));

describe("UploadDocumentModal", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(socketHandlers).forEach((key) => delete socketHandlers[key]);
    Object.keys(onboardingActions).forEach(
      (key) => delete onboardingActions[key],
    );
    onboardingMockState.emTour = false;
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

describe("UploadDocumentModal — simulação do tour (sc-simular-analise-documento)", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(onboardingActions).forEach(
      (key) => delete onboardingActions[key],
    );
    onboardingMockState.emTour = false;
  });

  it("não faz nada quando emTour é false", () => {
    render(
      <UploadDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    onboardingActions["sc-simular-analise-documento"]();

    expect(screen.queryByText("Análise em andamento")).not.toBeInTheDocument();
    expect(surgeryRequestService.extractFromDocument).not.toHaveBeenCalled();
  });

  // Usa `onboardingMockState` (mutable `vi.hoisted`), não `vi.doMock` +
  // `vi.resetModules` + import dinâmico como no rascunho original da tarefa:
  // o `vi.mock` estático deste arquivo já hoisteia `useOnboarding` para o
  // módulo real, e sobrescrever via `doMock`/`resetModules` no meio do
  // arquivo é frágil (mesma solução já usada em
  // `NewProcedureModelModal.spec.tsx` — "guard emTour").
  it("simula a análise e chama onSuccess com o resultado fabricado quando emTour é true", async () => {
    onboardingMockState.emTour = true;

    render(
      <UploadDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    onboardingActions["sc-simular-analise-documento"]();

    expect(await screen.findByText("Análise em andamento")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({ tempStoragePath: "tour-demo" }),
        );
      },
      { timeout: 3000 },
    );
    expect(surgeryRequestService.extractFromDocument).not.toHaveBeenCalled();
  });

  it("não chama onSuccess se o modal for fechado durante o delay fabricado da simulação", async () => {
    onboardingMockState.emTour = true;

    render(
      <UploadDocumentModal isOpen onClose={onClose} onSuccess={onSuccess} />,
    );

    onboardingActions["sc-simular-analise-documento"]();

    expect(await screen.findByText("Análise em andamento")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button", { name: "Fechar" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(onClose).toHaveBeenCalledTimes(1);

    // Espera passar o delay fabricado de 1.5s da simulação e confirma que o
    // `setTimeout` pendente não chamou `onSuccess` depois do fechamento.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(onSuccess).not.toHaveBeenCalled();
  }, 4000);
});
