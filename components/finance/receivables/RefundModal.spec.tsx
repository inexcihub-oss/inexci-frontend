import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { PaymentMethod, RefundReason } from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: { refundPayment: vi.fn() },
}));

import { financeService } from "@/services/finance.service";
import { RefundModal } from "./RefundModal";

const refundPayment = vi.mocked(financeService.refundPayment);

const pagamento = {
  id: "pay-1",
  method: PaymentMethod.PIX,
  amount: "150.00",
  refundedAmount: "50.00",
};

describe("RefundModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refundPayment.mockResolvedValue({} as never);
  });

  it("sugere o valor que ainda pode ser estornado e lista os motivos", () => {
    renderWithProviders(
      <RefundModal isOpen onClose={vi.fn()} payment={pagamento} />,
    );

    expect(screen.getByLabelText(/Valor do estorno/)).toHaveValue("R$ 100,00");
    const motivos = within(screen.getByLabelText(/Motivo/))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(motivos).toHaveLength(14);
    expect(motivos).toContain("Lançamento duplicado");
    expect(motivos).toContain("Outro motivo");
  });

  it("exige motivo e não deixa passar do disponível", async () => {
    renderWithProviders(
      <RefundModal isOpen onClose={vi.fn()} payment={pagamento} />,
    );
    const valor = screen.getByLabelText(/Valor do estorno/);
    await userEvent.clear(valor);
    await userEvent.type(valor, "10001");
    await userEvent.click(screen.getByRole("button", { name: "Estornar" }));

    expect(
      await screen.findByText("O valor passa do que ainda pode ser estornado."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Selecione o motivo do estorno."),
    ).toBeInTheDocument();
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("estorna parcialmente com motivo e observação", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <RefundModal isOpen onClose={onClose} payment={pagamento} />,
    );
    const valor = screen.getByLabelText(/Valor do estorno/);
    await userEvent.clear(valor);
    await userEvent.type(valor, "3000");
    await userEvent.selectOptions(
      screen.getByLabelText(/Motivo/),
      RefundReason.WRONG_AMOUNT,
    );
    await userEvent.type(screen.getByLabelText("Observação"), "Cobrou a mais");
    await userEvent.click(screen.getByRole("button", { name: "Estornar" }));

    await waitFor(() =>
      expect(refundPayment).toHaveBeenCalledWith("pay-1", {
        amount: "30.00",
        reason: "wrong_amount",
        notes: "Cobrou a mais",
      }),
    );
    expect(await screen.findByText("Estorno registrado.")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
