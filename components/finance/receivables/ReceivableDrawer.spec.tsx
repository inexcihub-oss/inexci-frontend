import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import {
  PaymentMethod,
  ReceivableStatus,
  RefundReason,
  type ReceivableDetailDto,
} from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    getReceivable: vi.fn(),
    cancelReceivableItem: vi.fn(),
    cancelReceivable: vi.fn(),
    listPaymentMethods: vi.fn().mockResolvedValue([]),
    listAccounts: vi.fn().mockResolvedValue([]),
    getCurrentCashSession: vi.fn().mockResolvedValue({ session: null }),
  },
}));
vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: { getAvailableDoctors: vi.fn().mockResolvedValue([]) },
}));

import { financeService } from "@/services/finance.service";
import { ReceivableDrawer } from "./ReceivableDrawer";

const svc = vi.mocked(financeService);

function cobranca(patch: Partial<ReceivableDetailDto> = {}): ReceivableDetailDto {
  return {
    id: "r-1",
    patient: { id: "p-1", name: "Ana Beatriz" },
    appointmentId: "a-1",
    referenceDate: "2026-10-20",
    dueDate: null,
    totalAmount: "300.00",
    paidAmount: "150.00",
    balance: "150.00",
    status: ReceivableStatus.PARTIAL,
    description: "Consulta",
    createdAt: "2026-10-20T12:00:00.000Z",
    notes: null,
    cancelledAt: null,
    cancelReason: null,
    cancelledBy: null,
    createdBy: null,
    items: [
      {
        id: "i-1",
        description: "Consulta particular",
        executedBy: { id: "d-1", name: "Dr. Fabio" },
        executedAt: null,
        appointmentId: "a-1",
        quantity: 1,
        unitAmount: "300.00",
        discount: "0.00",
        surcharge: "0.00",
        total: "300.00",
        cancelledAt: null,
      },
    ],
    payments: [
      {
        id: "pay-1",
        method: PaymentMethod.CREDIT_CARD,
        amount: "200.00",
        refundedAmount: "50.00",
        paidAt: "2026-10-20T13:00:00.000Z",
        account: { id: "acc-1", name: "Stone" },
        cashSessionId: null,
        receivedBy: { id: "u-1", name: "Secretária" },
        cardBrand: "Visa",
        installments: 3,
        nsu: null,
        authorizationCode: null,
        notes: null,
        refunds: [
          {
            id: "rf-1",
            amount: "50.00",
            reason: RefundReason.WRONG_AMOUNT,
            notes: null,
            createdAt: "2026-10-20T14:00:00.000Z",
            refundedBy: { id: "u-1", name: "Secretária" },
          },
        ],
      },
      {
        id: "pay-2",
        method: PaymentMethod.PIX,
        amount: "10.00",
        refundedAmount: "10.00",
        paidAt: "2026-10-20T13:05:00.000Z",
        account: null,
        cashSessionId: null,
        receivedBy: null,
        cardBrand: null,
        installments: null,
        nsu: null,
        authorizationCode: null,
        notes: null,
        refunds: [],
      },
    ],
    ...patch,
  };
}

describe("ReceivableDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra itens, pagamentos, estornos e as ações da cobrança", async () => {
    svc.getReceivable.mockResolvedValue(cobranca());
    const renderPaymentActions = vi.fn((p: { id: string }) => (
      <span>recibo-{p.id}</span>
    ));
    renderWithProviders(
      <ReceivableDrawer
        receivableId="r-1"
        isOpen
        onClose={vi.fn()}
        renderPaymentActions={renderPaymentActions}
      />,
    );

    expect(await screen.findByText("Consulta particular")).toBeInTheDocument();
    expect(screen.getByTestId("finance-status-badge")).toHaveTextContent(
      "Parcial",
    );
    expect(screen.getByText(/Cartão de crédito · 3x · Visa/)).toBeInTheDocument();
    expect(screen.getByText(/Estorno de R\$\s50,00 · Erro no valor lançado/)).toBeInTheDocument();

    const pagamentos = screen.getAllByTestId("pagamento");
    expect(within(pagamentos[0]).getByText("recibo-pay-1")).toBeInTheDocument();
    expect(within(pagamentos[1]).getByText("recibo-pay-2")).toBeInTheDocument();
    expect(
      within(pagamentos[0]).getByRole("button", { name: /Recibo/ }),
    ).toBeInTheDocument();
    expect(
      within(pagamentos[1]).getByRole("button", { name: /Recibo/ }),
    ).toBeInTheDocument();
    expect(
      within(pagamentos[0]).getByRole("button", { name: "Estornar" }),
    ).toBeInTheDocument();
    expect(
      within(pagamentos[1]).queryByRole("button", { name: "Estornar" }),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Receber" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adicionar item" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar cobrança" }),
    ).not.toBeInTheDocument();
  });

  it("cobrança sem pagamento pode ser cancelada com motivo", async () => {
    svc.getReceivable.mockResolvedValue(
      cobranca({
        paidAmount: "0.00",
        balance: "300.00",
        status: ReceivableStatus.OPEN,
        payments: [],
      }),
    );
    svc.cancelReceivable.mockResolvedValue(cobranca());
    renderWithProviders(
      <ReceivableDrawer receivableId="r-1" isOpen onClose={vi.fn()} />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar cobrança" }),
    );
    await userEvent.type(screen.getByLabelText(/Motivo/), "Lançada em duplicidade");
    const dialogo = screen.getAllByRole("dialog").at(-1) as HTMLElement;
    await userEvent.click(
      within(dialogo).getByRole("button", { name: "Cancelar cobrança" }),
    );

    await waitFor(() =>
      expect(svc.cancelReceivable).toHaveBeenCalledWith("r-1", {
        reason: "Lançada em duplicidade",
      }),
    );
  });

  it("cancela um item depois de confirmar", async () => {
    svc.getReceivable.mockResolvedValue(cobranca());
    svc.cancelReceivableItem.mockResolvedValue(cobranca());
    renderWithProviders(
      <ReceivableDrawer receivableId="r-1" isOpen onClose={vi.fn()} />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar item" }),
    );
    expect(svc.cancelReceivableItem).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );
    await waitFor(() =>
      expect(svc.cancelReceivableItem).toHaveBeenCalledWith("r-1", "i-1"),
    );
  });

  it("cobrança cancelada não oferece ações e mostra o motivo", async () => {
    svc.getReceivable.mockResolvedValue(
      cobranca({
        status: ReceivableStatus.CANCELLED,
        cancelledAt: "2026-10-20T15:00:00.000Z",
        cancelReason: "Paciente desistiu",
        payments: [],
      }),
    );
    renderWithProviders(
      <ReceivableDrawer receivableId="r-1" isOpen onClose={vi.fn()} />,
    );

    expect(await screen.findByText(/Paciente desistiu/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Receber" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar item" }),
    ).not.toBeInTheDocument();
  });

  it("abre o recebimento direto quando pedido", async () => {
    svc.getReceivable.mockResolvedValue(cobranca());
    renderWithProviders(
      <ReceivableDrawer
        receivableId="r-1"
        isOpen
        openReceiveOnLoad
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Receber pagamento")).toBeInTheDocument();
  });
});
