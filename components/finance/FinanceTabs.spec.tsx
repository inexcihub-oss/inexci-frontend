import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const replace = vi.fn();
let tabParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => ({ get: () => tabParam }),
}));

vi.mock("@/components/finance/tabs/ReceivablesTab", () => ({
  ReceivablesTab: () => <div>Contas a receber</div>,
}));
vi.mock("@/components/finance/tabs/PaymentsTab", () => ({
  PaymentsTab: () => <div>Recebimentos do período</div>,
}));
vi.mock("@/components/finance/tabs/CashTab", () => ({
  CashTab: () => <div>Caixa atual</div>,
}));
vi.mock("@/components/finance/tabs/ReportsTab", () => ({
  ReportsTab: () => <div>Relatórios financeiros</div>,
}));

import { FinanceTabs } from "./FinanceTabs";

describe("FinanceTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabParam = null;
  });

  it("abre em 'A receber' por padrão e lista as quatro abas", () => {
    render(<FinanceTabs />);
    const abas = screen.getAllByRole("tab");
    expect(abas.map((a) => a.textContent)).toEqual([
      "A receber",
      "Recebimentos",
      "Caixa",
      "Relatórios",
    ]);
    expect(screen.getByRole("tab", { name: "A receber" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Contas a receber")).toBeInTheDocument();
  });

  it("respeita a aba da URL", () => {
    tabParam = "caixa";
    render(<FinanceTabs />);
    expect(screen.getByRole("tab", { name: "Caixa" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ignora aba desconhecida na URL", () => {
    tabParam = "xpto";
    render(<FinanceTabs />);
    expect(screen.getByRole("tab", { name: "A receber" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("troca de aba e grava na URL", () => {
    render(<FinanceTabs />);
    fireEvent.click(screen.getByRole("tab", { name: "Relatórios" }));
    expect(replace).toHaveBeenCalledWith("?tab=relatorios", { scroll: false });
    expect(screen.getByRole("tab", { name: "Relatórios" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("leva às configurações do financeiro", () => {
    render(<FinanceTabs />);
    expect(
      screen.getByRole("link", { name: /Configurações/ }),
    ).toHaveAttribute("href", "/financeiro/configuracoes");
  });
});
