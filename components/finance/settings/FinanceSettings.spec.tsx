import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import {
  FinancialAccountType,
  PaymentMethod,
  type FinancialAccountDto,
  type PaymentMethodConfigDto,
} from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    listAccounts: vi.fn(),
    listPaymentMethods: vi.fn(),
    setAccountStatus: vi.fn(),
    updatePaymentMethod: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    listServicePrices: vi.fn(),
    getAccountStatement: vi.fn(),
  },
}));

vi.mock("@/hooks/useFinanceProfessionals", () => ({
  useFinanceProfessionals: () => ({ data: [] }),
}));

import { financeService } from "@/services/finance.service";
import { FinanceSettings } from "./FinanceSettings";

const svc = financeService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const contas: FinancialAccountDto[] = [
  {
    id: "acc-caixa",
    name: "Caixa Físico",
    type: FinancialAccountType.CASH_DRAWER,
    active: true,
    notes: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "acc-velha",
    name: "Banco antigo",
    type: FinancialAccountType.BANK,
    active: false,
    notes: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
];

function config(
  method: PaymentMethod,
  over: Partial<PaymentMethodConfigDto> = {},
): PaymentMethodConfigDto {
  return {
    method,
    active: true,
    defaultAccountId: null,
    defaultAccount: null,
    maxInstallments: 1,
    ...over,
  };
}

const formas = [
  config(PaymentMethod.PIX),
  config(PaymentMethod.CASH, {
    defaultAccountId: "acc-caixa",
    defaultAccount: { id: "acc-caixa", name: "Caixa Físico" },
  }),
  config(PaymentMethod.CREDIT_CARD),
  config(PaymentMethod.BOLETO, { active: false }),
];

describe("FinanceSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.listAccounts.mockImplementation((includeInactive?: boolean) =>
      Promise.resolve(
        includeInactive ? contas : contas.filter((c) => c.active),
      ),
    );
    svc.listPaymentMethods.mockResolvedValue(formas);
    svc.listServicePrices.mockResolvedValue([]);
  });

  it("lista as contas, inclusive as inativas, com o tipo", async () => {
    renderWithProviders(<FinanceSettings />);

    expect(await screen.findByText("Banco antigo")).toBeInTheDocument();
    expect(screen.getAllByText("Caixa Físico").length).toBeGreaterThan(0);
    expect(screen.getByText("Inativa")).toBeInTheDocument();
    expect(svc.listAccounts).toHaveBeenCalledWith(true);
  });

  it("desativa uma conta ativa e avisa", async () => {
    svc.setAccountStatus.mockResolvedValue({ ...contas[0], active: false });
    renderWithProviders(<FinanceSettings />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Desativar Caixa Físico" }),
    );

    await waitFor(() =>
      expect(svc.setAccountStatus).toHaveBeenCalledWith("acc-caixa", false),
    );
    expect(await screen.findByText("Conta desativada.")).toBeInTheDocument();
  });

  it("abre o modal de nova conta", async () => {
    renderWithProviders(<FinanceSettings />);

    await userEvent.click(screen.getByRole("button", { name: /Nova conta/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo")).toBeInTheDocument();
  });

  it("mostra as formas na ordem fixa e só contas ativas como conta padrão", async () => {
    renderWithProviders(<FinanceSettings />);

    const lista = await screen.findByRole("list", {
      name: "Formas de pagamento",
    });
    const nomes = within(lista)
      .getAllByRole("listitem")
      .map((l) => within(l).getAllByRole("checkbox")[0].parentElement?.textContent);
    expect(nomes).toEqual(["Dinheiro", "PIX", "Cartão de crédito", "Boleto"]);

    const select = await screen.findByLabelText("Conta padrão de PIX");
    await waitFor(() =>
      expect(
        within(select).getAllByRole("option").map((o) => o.textContent),
      ).toEqual(["Sem conta padrão", "Caixa Físico"]),
    );
    expect(screen.getByLabelText("Boleto ativa")).not.toBeChecked();
  });

  it("só o crédito permite editar parcelas", async () => {
    renderWithProviders(<FinanceSettings />);

    expect(
      await screen.findByLabelText("Parcelas de Cartão de crédito"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Parcelas de PIX")).not.toBeInTheDocument();
  });

  it("salva a forma de pagamento editada", async () => {
    svc.updatePaymentMethod.mockResolvedValue(
      config(PaymentMethod.CREDIT_CARD, { maxInstallments: 6 }),
    );
    renderWithProviders(<FinanceSettings />);

    const salvar = await screen.findByRole("button", {
      name: "Salvar Cartão de crédito",
    });
    expect(salvar).toBeDisabled();

    const parcelas = screen.getByLabelText("Parcelas de Cartão de crédito");
    await userEvent.clear(parcelas);
    await userEvent.type(parcelas, "6");
    await waitFor(() =>
      expect(within(screen.getByLabelText("Conta padrão de Cartão de crédito")).getAllByRole("option")).toHaveLength(2),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Conta padrão de Cartão de crédito"),
      "acc-caixa",
    );
    await userEvent.click(salvar);

    await waitFor(() =>
      expect(svc.updatePaymentMethod).toHaveBeenCalledWith("credit_card", {
        active: true,
        defaultAccountId: "acc-caixa",
        maxInstallments: 6,
      }),
    );
    expect(
      await screen.findByText("Cartão de crédito: configuração salva."),
    ).toBeInTheDocument();
  });

  it("recusa mais de 24 parcelas sem chamar a API", async () => {
    renderWithProviders(<FinanceSettings />);

    const parcelas = await screen.findByLabelText(
      "Parcelas de Cartão de crédito",
    );
    await userEvent.clear(parcelas);
    await userEvent.type(parcelas, "30");
    await userEvent.click(
      screen.getByRole("button", { name: "Salvar Cartão de crédito" }),
    );

    expect(
      await screen.findByText("O máximo é 24 parcelas."),
    ).toBeInTheDocument();
    expect(svc.updatePaymentMethod).not.toHaveBeenCalled();
  });

  it("mostra a tabela de preços", async () => {
    renderWithProviders(<FinanceSettings />);
    expect(screen.getByText("Tabela de preços")).toBeInTheDocument();
    expect(
      await screen.findByText(/Nenhum preço cadastrado/),
    ).toBeInTheDocument();
  });

  it("abre o extrato da conta", async () => {
    svc.getAccountStatement.mockResolvedValue({
      account: { id: "acc-caixa", name: "Caixa Físico", type: FinancialAccountType.CASH_DRAWER },
      openingBalance: "0.00",
      closingBalance: "0.00",
      entries: [],
    });
    renderWithProviders(<FinanceSettings />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Extrato Caixa Físico" }),
    );

    expect(
      await screen.findByText("Extrato — Caixa Físico"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(svc.getAccountStatement).toHaveBeenCalledWith(
        "acc-caixa",
        expect.objectContaining({ from: expect.any(String), to: expect.any(String) }),
      ),
    );
  });
});
