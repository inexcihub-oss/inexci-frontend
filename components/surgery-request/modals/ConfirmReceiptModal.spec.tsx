import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
    const { container } = render(<ConfirmReceiptModal {...defaultProps} />);
    selectValue();

    const file = new File(["x"], "comprovante.pdf", {
      type: "application/pdf",
    });
    const input = container.querySelector(
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
