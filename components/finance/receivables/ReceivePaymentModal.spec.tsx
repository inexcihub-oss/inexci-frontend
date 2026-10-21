import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import {
  FinancialAccountType,
  PaymentMethod,
  type PaymentMethodConfigDto,
} from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    listPaymentMethods: vi.fn(),
    listAccounts: vi.fn(),
    getCurrentCashSession: vi.fn(),
    registerPayment: vi.fn(),
  },
}));

import { financeService } from "@/services/finance.service";
import { ReceivePaymentModal } from "./ReceivePaymentModal";

const svc = vi.mocked(financeService);

function config(
  method: PaymentMethod,
  patch: Partial<PaymentMethodConfigDto> = {},
): PaymentMethodConfigDto {
  return {
    method,
    active: true,
    defaultAccountId: null,
    defaultAccount: null,
    maxInstallments: 1,
    ...patch,
  };
}

const conta = (id: string, name: string, type = FinancialAccountType.BANK) => ({
  id,
  name,
  type,
  active: true,
  notes: null,
  createdAt: "2026-10-01T00:00:00.000Z",
});

const sessaoAberta = {
  id: "cs-1",
  user: { id: "u-1", name: "Secretária" },
  account: { id: "acc-caixa", name: "Caixa Físico" },
  openedAt: "2026-10-20T11:00:00.000Z",
  closedAt: null,
  openingAmount: "100.00",
  cashBalance: "100.00",
  expectedAmount: null,
  countedAmount: null,
  difference: null,
  notes: null,
  closedBy: null,
  totalsByMethod: [],
  entries: [],
};

const cobranca = {
  id: "r-1",
  balance: "200.00",
  patient: { id: "p-1", name: "Ana Beatriz" },
};

function renderModal(onPaid = vi.fn(), onClose = vi.fn()) {
  renderWithProviders(
    <ReceivePaymentModal
      isOpen
      onClose={onClose}
      receivable={cobranca}
      onPaid={onPaid}
    />,
  );
  return { onPaid, onClose };
}

async function digitarValor(campo: HTMLElement, digitos: string) {
  await userEvent.clear(campo);
  await userEvent.type(campo, digitos);
}

describe("ReceivePaymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.listPaymentMethods.mockResolvedValue([
      config(PaymentMethod.CASH),
      config(PaymentMethod.PIX, { defaultAccountId: "acc-banco" }),
      config(PaymentMethod.CREDIT_CARD, {
        defaultAccountId: "acc-stone",
        maxInstallments: 3,
      }),
      config(PaymentMethod.BOLETO, { active: false }),
    ]);
    svc.listAccounts.mockResolvedValue([
      conta("acc-caixa", "Caixa Físico", FinancialAccountType.CASH_DRAWER),
      conta("acc-banco", "Banco"),
      conta("acc-stone", "Stone", FinancialAccountType.CARD_CREDIT),
    ]);
    svc.getCurrentCashSession.mockResolvedValue({ session: sessaoAberta });
    svc.registerPayment.mockResolvedValue({} as never);
  });

  it("mostra só as formas ativas e o caixa aberto no topo", async () => {
    renderModal();

    expect(await screen.findByText("Caixa aberto")).toBeInTheDocument();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));
    const opcoes = within(forma).getAllByRole("option").map((o) => o.textContent);
    expect(opcoes).toEqual(["Dinheiro", "PIX", "Cartão de crédito"]);
    expect(screen.getByLabelText(/^Valor/)).toHaveValue("R$ 200,00");
    expect(screen.getByLabelText("Conta de destino")).toHaveValue("acc-banco");
  });

  it("registra pagamento dividido em PIX e crédito parcelado", async () => {
    const { onPaid, onClose } = renderModal();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));

    await digitarValor(screen.getByLabelText(/^Valor/), "10000");
    expect(screen.getByTestId("valor-restante")).toHaveTextContent("R$ 100,00");

    await userEvent.click(screen.getByRole("button", { name: "Adicionar forma" }));
    const formas = screen.getAllByLabelText("Forma de pagamento");
    await userEvent.selectOptions(formas[1], PaymentMethod.CREDIT_CARD);
    expect(screen.getAllByLabelText(/^Valor/)[1]).toHaveValue("R$ 100,00");
    expect(screen.getAllByLabelText("Conta de destino")[1]).toHaveValue(
      "acc-stone",
    );
    await userEvent.selectOptions(screen.getByLabelText("Parcelas"), "3");
    await userEvent.type(screen.getByLabelText("Bandeira"), "Visa");
    expect(screen.getByTestId("valor-restante")).toHaveTextContent("R$ 0,00");

    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );

    await waitFor(() =>
      expect(svc.registerPayment).toHaveBeenCalledWith("r-1", {
        lines: [
          { method: "pix", amount: "100.00", accountId: "acc-banco" },
          {
            method: "credit_card",
            amount: "100.00",
            accountId: "acc-stone",
            installments: 3,
            cardBrand: "Visa",
          },
        ],
        idempotencyKey: expect.any(String),
      }),
    );
    expect(await screen.findByText("Pagamento registrado.")).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("parcelas do crédito vão só até o máximo configurado", async () => {
    renderModal();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));

    expect(screen.queryByLabelText("Parcelas")).not.toBeInTheDocument();
    await userEvent.selectOptions(forma, PaymentMethod.CREDIT_CARD);

    const parcelas = screen.getByLabelText("Parcelas");
    expect(
      within(parcelas).getAllByRole("option").map((o) => o.textContent),
    ).toEqual(["1x", "2x", "3x"]);
    expect(screen.getByLabelText("NSU")).toBeInTheDocument();
    expect(screen.getByLabelText("Autorização")).toBeInTheDocument();
  });

  it("dinheiro sem caixa aberto avisa e bloqueia o envio", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: null });
    renderModal();

    expect(await screen.findByText("Caixa fechado")).toBeInTheDocument();
    const forma = screen.getByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));
    await userEvent.selectOptions(forma, PaymentMethod.CASH);

    expect(
      screen.getByText("Abra o caixa para receber em dinheiro."),
    ).toBeInTheDocument();
    const enviar = screen.getByRole("button", { name: "Registrar pagamento" });
    expect(enviar).toBeDisabled();
    await userEvent.click(enviar);
    expect(svc.registerPayment).not.toHaveBeenCalled();
  });

  it("dinheiro com caixa aberto entra no caixa e não envia conta", async () => {
    renderModal();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));
    await userEvent.selectOptions(forma, PaymentMethod.CASH);

    expect(
      screen.getByText("Entra no caixa aberto (Caixa Físico)."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );
    await waitFor(() =>
      expect(svc.registerPayment).toHaveBeenCalledWith("r-1", {
        lines: [{ method: "cash", amount: "200.00" }],
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it("não envia quando a soma passa do saldo", async () => {
    renderModal();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));
    await digitarValor(screen.getByLabelText(/^Valor/), "20001");

    expect(screen.getByTestId("valor-restante")).toHaveTextContent(
      "Excede o saldo em",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Registrar pagamento" }),
    );
    expect(
      await screen.findByText("A soma das formas passa do saldo em aberto."),
    ).toBeInTheDocument();
    expect(svc.registerPayment).not.toHaveBeenCalled();
  });

  it("reenvio na mesma abertura usa a mesma chave de idempotência", async () => {
    svc.registerPayment
      .mockRejectedValueOnce(new Error("rede caiu"))
      .mockResolvedValueOnce({} as never);
    renderModal();
    const forma = await screen.findByLabelText("Forma de pagamento");
    await waitFor(() => expect(forma).toHaveValue("pix"));
    const botao = screen.getByRole("button", { name: "Registrar pagamento" });

    await userEvent.click(botao);
    await waitFor(() => expect(svc.registerPayment).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(botao).toBeEnabled());
    await userEvent.click(botao);
    await waitFor(() => expect(svc.registerPayment).toHaveBeenCalledTimes(2));

    const [primeira, segunda] = svc.registerPayment.mock.calls.map(
      ([, payload]) => payload.idempotencyKey,
    );
    expect(primeira).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(segunda).toBe(primeira);
  });

  it("cada abertura do modal gera uma chave nova", async () => {
    const props = {
      onClose: vi.fn(),
      receivable: cobranca,
    };
    const { rerender } = renderWithProviders(
      <ReceivePaymentModal isOpen {...props} />,
    );
    const registrar = async () => {
      const forma = await screen.findByLabelText("Forma de pagamento");
      await waitFor(() => expect(forma).toHaveValue("pix"));
      await userEvent.click(
        screen.getByRole("button", { name: "Registrar pagamento" }),
      );
    };

    await registrar();
    await waitFor(() => expect(svc.registerPayment).toHaveBeenCalledTimes(1));
    rerender(<ReceivePaymentModal isOpen={false} {...props} />);
    rerender(<ReceivePaymentModal isOpen {...props} />);
    await registrar();
    await waitFor(() => expect(svc.registerPayment).toHaveBeenCalledTimes(2));

    const [primeira, segunda] = svc.registerPayment.mock.calls.map(
      ([, payload]) => payload.idempotencyKey,
    );
    expect(primeira).toEqual(expect.any(String));
    expect(segunda).toEqual(expect.any(String));
    expect(segunda).not.toBe(primeira);
  });
});
