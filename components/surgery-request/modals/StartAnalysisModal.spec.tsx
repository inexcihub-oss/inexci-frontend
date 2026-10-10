import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const startAnalysisMock = vi.fn();
vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    startAnalysis: (...args: unknown[]) => startAnalysisMock(...args),
  },
}));

const uploadMock = vi.fn();
vi.mock("@/services/document.service", () => ({
  documentService: { upload: (...args: unknown[]) => uploadMock(...args) },
  DOCUMENT_FOLDERS: { PRE_SURGERY: "documents" },
}));

const showToastMock = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

import { StartAnalysisModal } from "./StartAnalysisModal";

function preencherCamposObrigatorios() {
  return {
    requestNumber: screen.getAllByPlaceholderText("Ex: 0000000-0")[0],
  };
}

function makeFile(name: string, sizeBytes = 1024, type = "application/pdf") {
  const file = new File(["conteudo"], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("StartAnalysisModal — documento opcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startAnalysisMock.mockResolvedValue({});
    uploadMock.mockResolvedValue({ id: "doc-1" });
  });

  async function preencherESubmeter(user: ReturnType<typeof userEvent.setup>) {
    const { requestNumber } = preencherCamposObrigatorios();
    await user.type(requestNumber, "12345");
    await user.click(screen.getByRole("button", { name: "Atualizar status" }));
  }

  it("envia sem documento quando nenhum arquivo é selecionado (comportamento atual)", async () => {
    const user = userEvent.setup();
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );

    await preencherESubmeter(user);

    await waitFor(() => expect(startAnalysisMock).toHaveBeenCalled());
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("mostra o nome do arquivo depois de selecionado", async () => {
    const user = userEvent.setup();
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile("laudo.pdf"));

    expect(screen.getByText("laudo.pdf")).toBeInTheDocument();
  });

  it("rejeita extensão não permitida", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile("virus.exe"));

    expect(
      screen.getByText(/Formato inválido/i),
    ).toBeInTheDocument();
  });

  it("faz upload do documento antes de indicar a análise quando há arquivo", async () => {
    const user = userEvent.setup();
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile("laudo.pdf"));

    await preencherESubmeter(user);

    await waitFor(() => expect(startAnalysisMock).toHaveBeenCalled());
    expect(uploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        surgeryRequestId: "sc-1",
        key: "additional_document",
        name: "laudo",
        folder: "documents",
      }),
    );
    const uploadOrder = uploadMock.mock.invocationCallOrder[0];
    const startAnalysisOrder = startAnalysisMock.mock.invocationCallOrder[0];
    expect(uploadOrder).toBeLessThan(startAnalysisOrder);
  });

  it("bloqueia a transição e mostra erro quando o upload falha", async () => {
    uploadMock.mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(input, makeFile("laudo.pdf"));

    await preencherESubmeter(user);

    await waitFor(() => expect(uploadMock).toHaveBeenCalled());
    expect(startAnalysisMock).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringMatching(/erro/i),
      "error",
    );
  });
});

describe("StartAnalysisModal — formulário (Zod)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startAnalysisMock.mockResolvedValue({});
  });

  function renderModal() {
    render(
      <StartAnalysisModal
        isOpen
        onClose={vi.fn()}
        surgeryRequestId="sc-1"
        onSuccess={vi.fn()}
      />,
    );
  }

  it("não chama a API sem o nº da solicitação e marca o campo", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: "Atualizar status" }));

    expect(startAnalysisMock).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      "Preencha: Nº da solicitação",
      "error",
    );
    expect(screen.getByLabelText(/Nº da solicitação/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("envia as cotações preenchidas na posição certa", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/Nº da solicitação/), " 123 ");
    const propostas = screen.getAllByLabelText("Nº da proposta");
    await user.type(propostas[1], "P-2");
    await user.click(screen.getByRole("button", { name: "Atualizar status" }));

    await waitFor(() => expect(startAnalysisMock).toHaveBeenCalled());
    const payload = startAnalysisMock.mock.calls[0][1];
    expect(payload.requestNumber).toBe("123");
    expect(payload.quotation2Number).toBe("P-2");
    expect(payload).not.toHaveProperty("quotation1Number");
    expect(payload).not.toHaveProperty("quotation2ReceivedAt");
  });
});
