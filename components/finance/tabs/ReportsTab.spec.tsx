import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import type {
  ReceiptsReportDto,
  ReceiptsReportParams,
} from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    getReceiptsReport: vi.fn(),
    exportReceiptsReportCsv: vi.fn(),
    getProductionReport: vi.fn(),
    exportProductionReportCsv: vi.fn(),
    getOpenReport: vi.fn(),
    exportOpenReportCsv: vi.fn(),
  },
}));

vi.mock("@/lib/calendar-date", () => ({
  todayISODate: () => "2026-10-20",
}));

import { financeService } from "@/services/finance.service";
import { ReportsTab } from "./ReportsTab";

const svc = financeService as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

const totais = { received: "1000.00", refunded: "100.00", net: "900.00", count: 7 };

function relatorio(params: ReceiptsReportParams): ReceiptsReportDto {
  const linhas: Record<string, ReceiptsReportDto["rows"]> = {
    method: [
      { key: "pix", label: "PIX", received: "600.00", refunded: "0.00", net: "600.00", count: 4 },
      { key: "cash", label: "Dinheiro", received: "400.00", refunded: "100.00", net: "300.00", count: 3 },
    ],
    account: [
      { key: "acc-1", label: "Conta Cora", received: "1000.00", refunded: "100.00", net: "900.00", count: 7 },
    ],
    user: [
      { key: "u-1", label: "Recepção Maria", received: "1000.00", refunded: "100.00", net: "900.00", count: 7 },
    ],
    month: [
      { key: "2026-09", label: "09/2026", received: "500.00", refunded: "0.00", net: "500.00", count: 2 },
      { key: "2026-10", label: "10/2026", received: "1000.00", refunded: "100.00", net: "900.00", count: 7 },
    ],
  };
  return { groupBy: params.groupBy, rows: linhas[params.groupBy] ?? [], totals: totais };
}

describe("ReportsTab", () => {
  const createObjectURL = vi.fn(() => "blob:csv");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    svc.getReceiptsReport.mockImplementation((p: ReceiptsReportParams) =>
      Promise.resolve(relatorio(p)),
    );
    svc.getProductionReport.mockResolvedValue({
      rows: [
        { executedById: "doc-1", name: "Dr. Fabio", items: 5, billed: "1500.00", received: "900.00" },
      ],
      totals: { items: 5, billed: "1500.00", received: "900.00" },
    });
    svc.getOpenReport.mockResolvedValue({
      rows: [
        {
          receivableId: "rec-1",
          patient: { id: "p-1", name: "Maria Souza" },
          referenceDate: "2026-10-01",
          dueDate: null,
          totalAmount: "300.00",
          paidAmount: "100.00",
          balance: "200.00",
          ageDays: 19,
        },
      ],
      totals: { count: 1, balance: "200.00" },
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("busca o mês corrente e mostra os cartões com ticket médio em centavos", async () => {
    renderWithProviders(<ReportsTab />);

    await waitFor(() =>
      expect(screen.getByLabelText("Total: Recebido líquido")).toHaveTextContent(
        /R\$\s900,00/,
      ),
    );
    expect(screen.getByLabelText("Total: Em aberto")).toHaveTextContent(/R\$\s200,00/);
    expect(screen.getByLabelText("Total: Ticket médio")).toHaveTextContent(
      /R\$\s128,57/,
    );
    expect(svc.getReceiptsReport).toHaveBeenCalledWith({
      from: "2026-10-01",
      to: "2026-10-20",
      groupBy: "method",
    });
    expect(svc.getReceiptsReport).toHaveBeenCalledWith(
      expect.objectContaining({ groupBy: "month" }),
    );
    expect(svc.getOpenReport).toHaveBeenCalledWith({ until: "2026-10-20" });
    expect(svc.getProductionReport).toHaveBeenCalledWith({
      from: "2026-10-01",
      to: "2026-10-20",
    });
  });

  it("no mobile cada linha do relatório vira um cartão com os valores rotulados", async () => {
    renderWithProviders(<ReportsTab />);

    const cartoes = await screen.findByRole("list", {
      name: "Por forma de pagamento (lista)",
    });
    const pix = within(cartoes)
      .getAllByRole("listitem")
      .find((li) => li.textContent?.startsWith("PIX"));
    expect(pix).toBeDefined();
    expect(within(pix!).getByText("Líquido")).toBeInTheDocument();
    expect(within(cartoes).getAllByRole("listitem").at(-1)).toHaveTextContent(
      /^Total/,
    );
  });

  it("monta as tabelas por forma, conta, usuário, profissional e em aberto, e o gráfico mensal", async () => {
    renderWithProviders(<ReportsTab />);

    const porForma = await screen.findByRole("table", {
      name: "Por forma de pagamento",
    });
    expect(within(porForma).getByText("PIX")).toBeInTheDocument();
    expect(within(porForma).getByText("Dinheiro")).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: "Por conta" }),
    ).toHaveTextContent("Conta Cora");
    expect(
      await screen.findByRole("table", { name: "Por usuário" }),
    ).toHaveTextContent("Recepção Maria");
    expect(
      await screen.findByRole("table", { name: "Por profissional" }),
    ).toHaveTextContent("Dr. Fabio");
    const aberto = await screen.findByRole("table", { name: "Em aberto" });
    expect(aberto).toHaveTextContent("Maria Souza");
    expect(aberto).toHaveTextContent("01/10/2026");

    const grafico = await screen.findByRole("list", {
      name: "Recebido líquido por mês",
    });
    expect(within(grafico).getAllByRole("listitem")).toHaveLength(2);
  });

  it("troca o período e refaz as consultas", async () => {
    renderWithProviders(<ReportsTab />);
    await screen.findByRole("table", { name: "Por forma de pagamento" });

    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-09-01" },
    });

    await waitFor(() =>
      expect(svc.getReceiptsReport).toHaveBeenCalledWith({
        from: "2026-09-01",
        to: "2026-10-20",
        groupBy: "method",
      }),
    );
  });

  it("período invertido mostra erro e não consulta", async () => {
    renderWithProviders(<ReportsTab />);
    await screen.findByRole("table", { name: "Por forma de pagamento" });
    svc.getReceiptsReport.mockClear();

    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-11-01" },
    });

    expect(
      await screen.findByText(
        "A data inicial deve ser anterior ou igual à final.",
      ),
    ).toBeInTheDocument();
    expect(svc.getReceiptsReport).not.toHaveBeenCalled();
  });

  it("exporta o CSV da tabela e baixa o arquivo", async () => {
    const blob = new Blob(["a;b"], { type: "text/csv" });
    svc.exportReceiptsReportCsv.mockResolvedValue(blob);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    renderWithProviders(<ReportsTab />);
    await screen.findByRole("table", { name: "Por forma de pagamento" });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Exportar CSV por forma de pagamento",
      }),
    );

    await waitFor(() =>
      expect(svc.exportReceiptsReportCsv).toHaveBeenCalledWith({
        from: "2026-10-01",
        to: "2026-10-20",
        groupBy: "method",
      }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
  });

  it("avisa por toast quando a exportação falha", async () => {
    svc.exportOpenReportCsv.mockRejectedValue(new Error("Falha no servidor."));
    renderWithProviders(<ReportsTab />);
    await screen.findByRole("table", { name: "Em aberto" });

    await userEvent.click(
      screen.getByRole("button", { name: "Exportar CSV em aberto" }),
    );

    expect(await screen.findByText("Falha no servidor.")).toBeInTheDocument();
    expect(svc.exportOpenReportCsv).toHaveBeenCalledWith({ until: "2026-10-20" });
  });
});
