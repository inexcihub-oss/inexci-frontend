import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders as render } from "@/test-utils/render-with-providers";
import { ConfirmReceiptModal } from "./ConfirmReceiptModal";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { documentService } from "@/services/document.service";

vi.mock("@/services/surgery-request.service", () => ({
  surgeryRequestService: {
    confirmReceipt: vi.fn(),
    updateReceipt: vi.fn(),
    contestPayment: vi.fn(),
  },
}));

vi.mock("@/services/document.service", () => ({
  DOCUMENT_FOLDERS: { PRE_SURGERY: "documents" },
  documentService: { upload: vi.fn() },
}));

const solicitacao = {
  id: "sc-1",
  billing: { invoiceValue: 100, invoiceProtocol: "P1" },
  receipt: null,
} as never;

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  solicitacao,
  onSuccess: vi.fn(),
};

function selectValue() {
  fireEvent.change(screen.getByPlaceholderText("R$ 0,00"), {
    target: { value: "10000" },
  });
}

describe("ConfirmReceiptModal — anexo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.confirmReceipt).mockResolvedValue(
      {} as never,
    );
    vi.mocked(documentService.upload).mockResolvedValue({} as never);
  });

  it("faz upload do comprovante selecionado ao confirmar", async () => {
    render(<ConfirmReceiptModal {...defaultProps} />);
    selectValue();

    const file = new File(["x"], "comprovante.pdf", {
      type: "application/pdf",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(documentService.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          surgeryRequestId: "sc-1",
          key: "comprovante-recebimento",
          name: "comprovante.pdf",
          file,
        }),
      );
    });
  });

  it("não chama upload quando nenhum arquivo é anexado", async () => {
    render(<ConfirmReceiptModal {...defaultProps} />);
    selectValue();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(surgeryRequestService.confirmReceipt).toHaveBeenCalled(),
    );
    expect(documentService.upload).not.toHaveBeenCalled();
  });
});

describe("ConfirmReceiptModal — formulário (Zod)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(surgeryRequestService.confirmReceipt).mockResolvedValue(
      {} as never,
    );
    vi.mocked(surgeryRequestService.contestPayment).mockResolvedValue(
      {} as never,
    );
  });

  it("sem valor recebido não chama a API e avisa pelo toast global", async () => {
    render(<ConfirmReceiptModal {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(
      await screen.findByText("Preencha: Valor recebido"),
    ).toBeInTheDocument();
    expect(surgeryRequestService.confirmReceipt).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Valor recebido")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("valor divergente leva ao recurso, que exige destinatário", async () => {
    render(<ConfirmReceiptModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("R$ 0,00"), {
      target: { value: "5000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar e recorrer" }),
    );

    expect(await screen.findByText("Contestar recebimento")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar recurso" }));

    expect(
      await screen.findByText("Preencha: Destinatários"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Informe pelo menos um destinatário"),
    ).toBeInTheDocument();
    expect(surgeryRequestService.confirmReceipt).not.toHaveBeenCalled();
  });
});
