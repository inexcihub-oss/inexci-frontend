import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import {
  FinancialAccountType,
  FinancialEntryDirection,
  FinancialEntryKind,
} from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    getAccountStatement: vi.fn(),
    exportAccountStatementCsv: vi.fn(),
  },
}));

vi.mock("@/lib/calendar-date", () => ({
  todayISODate: () => "2026-10-20",
}));

import { financeService } from "@/services/finance.service";
import { AccountStatementModal } from "./AccountStatementModal";

const svc = financeService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

const conta = { id: "acc-1", name: "Caixa Físico" };

describe("AccountStatementModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:x"),
      revokeObjectURL: vi.fn(),
    });
    svc.getAccountStatement.mockResolvedValue({
      account: { id: "acc-1", name: "Caixa Físico", type: FinancialAccountType.CASH_DRAWER },
      openingBalance: "100.00",
      closingBalance: "350.00",
      entries: [
        {
          id: "e-1",
          occurredAt: "2026-10-05T13:00:00.000Z",
          direction: FinancialEntryDirection.IN,
          kind: FinancialEntryKind.PAYMENT,
          amount: "300.00",
          description: "Consulta Maria",
          balance: "400.00",
        },
        {
          id: "e-2",
          occurredAt: "2026-10-06T13:00:00.000Z",
          direction: FinancialEntryDirection.OUT,
          kind: FinancialEntryKind.WITHDRAWAL,
          amount: "50.00",
          description: null,
          balance: "350.00",
        },
      ],
    });
  });

  it("carrega o extrato do mês com saldos e movimentos", async () => {
    renderWithProviders(
      <AccountStatementModal isOpen onClose={vi.fn()} account={conta} />,
    );

    expect(screen.getByText("Extrato — Caixa Físico")).toBeInTheDocument();
    expect(
      await screen.findByLabelText("Valor do saldo inicial"),
    ).toHaveTextContent(/R\$\s100,00/);
    expect(screen.getByLabelText("Valor do saldo final")).toHaveTextContent(
      /R\$\s350,00/,
    );
    const tabela = screen.getByRole("list", { name: "Movimentos" });
    expect(within(tabela).getByText(/Recebimento · Consulta Maria/)).toBeInTheDocument();
    expect(within(tabela).getByText("Retirada")).toBeInTheDocument();
    expect(svc.getAccountStatement).toHaveBeenCalledWith("acc-1", {
      from: "2026-10-01",
      to: "2026-10-20",
    });
  });

  it("refaz a consulta ao trocar o período", async () => {
    renderWithProviders(
      <AccountStatementModal isOpen onClose={vi.fn()} account={conta} />,
    );
    await screen.findByRole("list", { name: "Movimentos" });

    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-09-15" },
    });

    await waitFor(() =>
      expect(svc.getAccountStatement).toHaveBeenCalledWith("acc-1", {
        from: "2026-09-15",
        to: "2026-10-20",
      }),
    );
  });

  it("exporta o CSV do extrato", async () => {
    const blob = new Blob(["x"]);
    svc.exportAccountStatementCsv.mockResolvedValue(blob);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
    renderWithProviders(
      <AccountStatementModal isOpen onClose={vi.fn()} account={conta} />,
    );
    await screen.findByRole("list", { name: "Movimentos" });

    await userEvent.click(screen.getByRole("button", { name: /Exportar CSV/ }));

    await waitFor(() =>
      expect(svc.exportAccountStatementCsv).toHaveBeenCalledWith("acc-1", {
        from: "2026-10-01",
        to: "2026-10-20",
      }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("não consulta fechado", () => {
    renderWithProviders(
      <AccountStatementModal isOpen={false} onClose={vi.fn()} account={conta} />,
    );
    expect(svc.getAccountStatement).not.toHaveBeenCalled();
  });
});
