import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { Permission } from "@/lib/permissions";
import {
  FinancialAccountType,
  FinancialEntryDirection,
  FinancialEntryKind,
  PaymentMethod,
  type CashSessionSummaryDto,
} from "@/types/finance.types";

let authState: { user: { id: string }; can: (p: Permission) => boolean } = {
  user: { id: "u-1" },
  can: (p) => p === Permission.FINANCEIRO,
};
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));

vi.mock("@/services/finance.service", () => ({
  financeService: {
    getCurrentCashSession: vi.fn(),
    listCashSessions: vi.fn(),
    getCashSession: vi.fn(),
    listAccounts: vi.fn(),
    openCashSession: vi.fn(),
    withdrawFromCashSession: vi.fn(),
    supplyCashSession: vi.fn(),
    closeCurrentCashSession: vi.fn(),
    closeCashSession: vi.fn(),
  },
}));

import { financeService } from "@/services/finance.service";
import { CashTab } from "./CashTab";

const svc = vi.mocked(financeService);

const sessao: CashSessionSummaryDto = {
  id: "cs-1",
  user: { id: "u-1", name: "Secretária" },
  account: { id: "acc-caixa", name: "Caixa Físico" },
  openedAt: "2026-10-20T11:00:00.000Z",
  closedAt: null,
  openingAmount: "100.00",
  cashBalance: "250.00",
  expectedAmount: null,
  countedAmount: null,
  difference: null,
  notes: null,
  closedBy: null,
  totalsByMethod: [
    { method: PaymentMethod.CASH, received: "200.00", refunded: "0.00", net: "200.00" },
    { method: PaymentMethod.PIX, received: "150.00", refunded: "30.00", net: "120.00" },
  ],
  entries: [
    {
      id: "e-1",
      direction: FinancialEntryDirection.IN,
      kind: FinancialEntryKind.SUPPLY,
      amount: "100.00",
      occurredAt: "2026-10-20T11:00:00.000Z",
      description: "Abertura",
      paymentId: null,
      refundId: null,
    },
    {
      id: "e-2",
      direction: FinancialEntryDirection.OUT,
      kind: FinancialEntryKind.WITHDRAWAL,
      amount: "50.00",
      occurredAt: "2026-10-20T15:00:00.000Z",
      description: "Depósito",
      paymentId: null,
      refundId: null,
    },
  ],
};

const caixaDeOutro = {
  id: "cs-9",
  user: { id: "u-2", name: "Joana" },
  account: { id: "acc-caixa", name: "Caixa Físico" },
  openedAt: "2026-10-19T11:00:00.000Z",
  closedAt: null,
  openingAmount: "0.00",
  expectedAmount: null,
  countedAmount: null,
  difference: null,
};

describe("CashTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      user: { id: "u-1" },
      can: (p) => p === Permission.FINANCEIRO,
    };
    svc.listCashSessions.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    svc.listAccounts.mockResolvedValue([
      {
        id: "acc-caixa",
        name: "Caixa Físico",
        type: FinancialAccountType.CASH_DRAWER,
        active: true,
        notes: null,
        createdAt: "2026-10-01T00:00:00.000Z",
      },
      {
        id: "acc-banco",
        name: "Banco",
        type: FinancialAccountType.BANK,
        active: true,
        notes: null,
        createdAt: "2026-10-01T00:00:00.000Z",
      },
    ]);
  });

  it("caixa fechado oferece abrir com conta de caixa físico e valor de abertura", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: null });
    svc.openCashSession.mockResolvedValue(sessao);
    renderWithProviders(<CashTab />);

    await userEvent.click(await screen.findByRole("button", { name: "Abrir caixa" }));
    const caixa = await screen.findByLabelText(/^Caixa/);
    await waitFor(() => expect(caixa).toHaveValue("acc-caixa"));
    expect(screen.queryByRole("option", { name: "Banco" })).not.toBeInTheDocument();
    const valor = screen.getByLabelText(/Valor de abertura/);
    await userEvent.clear(valor);
    await userEvent.type(valor, "10000");
    const botoes = screen.getAllByRole("button", { name: "Abrir caixa" });
    await userEvent.click(botoes[botoes.length - 1]);

    await waitFor(() =>
      expect(svc.openCashSession).toHaveBeenCalledWith({
        accountId: "acc-caixa",
        openingAmount: "100.00",
      }),
    );
    expect(await screen.findByText("Caixa aberto.")).toBeInTheDocument();
  });

  it("caixa aberto mostra saldo, totais por forma e movimentos", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: sessao });
    renderWithProviders(<CashTab />);

    expect(await screen.findByTestId("saldo-caixa")).toHaveTextContent(
      "R$ 250,00",
    );
    expect(
      within(screen.getByRole("list", { name: "Recebimentos por forma" })).getByText("PIX"),
    ).toBeInTheDocument();
    expect(screen.getByText(/R\$\s120,00/)).toBeInTheDocument();
    expect(screen.getByText("Suprimento · Abertura")).toBeInTheDocument();
    expect(screen.getByText("Retirada · Depósito")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Exportar fechamento/ }),
    ).toBeInTheDocument();
  });

  it("registra uma retirada", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: sessao });
    svc.withdrawFromCashSession.mockResolvedValue(sessao);
    renderWithProviders(<CashTab />);

    await userEvent.click(await screen.findByRole("button", { name: "Retirada" }));
    await userEvent.type(screen.getByLabelText(/^Valor/), "5000");
    await userEvent.type(screen.getByLabelText(/Descrição/), "Depósito no banco");
    await userEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() =>
      expect(svc.withdrawFromCashSession).toHaveBeenCalledWith({
        amount: "50.00",
        description: "Depósito no banco",
      }),
    );
    expect(svc.supplyCashSession).not.toHaveBeenCalled();
  });

  it("fechar o caixa abre o modal com o esperado", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: sessao });
    renderWithProviders(<CashTab />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Fechar caixa" }),
    );
    expect(screen.getByTestId("valor-esperado")).toHaveTextContent("R$ 250,00");
  });

  it("sem Administração não vê caixas abertos de outros", async () => {
    svc.getCurrentCashSession.mockResolvedValue({ session: null });
    svc.listCashSessions.mockResolvedValue({
      data: [caixaDeOutro],
      total: 1,
      page: 1,
      limit: 20,
    });
    renderWithProviders(<CashTab />);

    expect(await screen.findByText(/Joana/)).toBeInTheDocument();
    expect(
      screen.queryByText("Caixas abertos de outros usuários"),
    ).not.toBeInTheDocument();
  });

  it("com Administração fecha o caixa esquecido de outro usuário", async () => {
    authState = {
      user: { id: "u-1" },
      can: (p) => p === Permission.FINANCEIRO || p === Permission.ADMINISTRACAO,
    };
    svc.getCurrentCashSession.mockResolvedValue({ session: null });
    svc.listCashSessions.mockResolvedValue({
      data: [caixaDeOutro],
      total: 1,
      page: 1,
      limit: 20,
    });
    svc.getCashSession.mockResolvedValue({
      ...sessao,
      id: "cs-9",
      user: { id: "u-2", name: "Joana" },
      cashBalance: "80.00",
    });
    svc.closeCashSession.mockResolvedValue(sessao);
    renderWithProviders(<CashTab />);

    expect(
      await screen.findByText("Caixas abertos de outros usuários"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(await screen.findByTestId("valor-esperado")).toHaveTextContent(
      "R$ 80,00",
    );
    await userEvent.type(screen.getByLabelText(/Valor contado/), "8000");
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));

    await waitFor(() =>
      expect(svc.closeCashSession).toHaveBeenCalledWith("cs-9", {
        countedAmount: "80.00",
        notes: undefined,
      }),
    );
    expect(svc.closeCurrentCashSession).not.toHaveBeenCalled();
  });
});
