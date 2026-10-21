import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    getPaymentReceiptPreview: vi.fn(),
    getPaymentReceiptPdf: vi.fn(),
  },
}));

import { financeService } from "@/services/finance.service";
import { ReceiptButton } from "./ReceiptButton";

const svc = vi.mocked(financeService);

describe("ReceiptButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.getPaymentReceiptPreview.mockResolvedValue(
      "<html><body><p>Recebi de Ana</p><script>alert(1)</script></body></html>",
    );
  });

  it("mostra a prévia no mesmo componente dos outros documentos, sanitizada e com respiro", async () => {
    renderWithProviders(<ReceiptButton paymentId="pay-1" />);

    await userEvent.click(screen.getByRole("button", { name: /Recibo/ }));

    const host = await screen.findByTestId("document-preview");
    await waitFor(() =>
      expect(host.shadowRoot?.innerHTML).toContain("Recebi de Ana"),
    );
    expect(host.shadowRoot?.innerHTML).not.toContain("<script");
    expect(screen.getByLabelText("Prévia do recibo")).toHaveClass("p-3");
    expect(svc.getPaymentReceiptPreview).toHaveBeenCalledWith("pay-1");
  });
});
