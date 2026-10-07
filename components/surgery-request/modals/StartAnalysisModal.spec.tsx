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
  // "Ex: 0000000-0" também é o placeholder dos campos de cotação; o
  // primeiro da lista é o Nº da solicitação (topo do formulário).
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
    // O atributo `accept` do input já filtra no picker do SO; desligamos o
    // filtro do user-event para simular quem troca para "Todos os arquivos".
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
