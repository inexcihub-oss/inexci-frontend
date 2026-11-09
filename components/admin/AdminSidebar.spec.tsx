import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const logout = vi.fn();
let pathname = "/admin/dashboard";

vi.mock("@/contexts/AdminAuthContext", () => ({
  useAdminAuth: () => ({
    admin: {
      id: "a-1",
      name: "Ana Admin",
      email: "ana@inexci.com",
      mfaEnabled: true,
    },
    logout,
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import AdminSidebar from "./AdminSidebar";

describe("AdminSidebar", () => {
  beforeEach(() => {
    logout.mockClear();
    pathname = "/admin/dashboard";
    localStorage.clear();
  });

  it("renderiza as seções e os itens do painel com os links certos", () => {
    render(<AdminSidebar />);

    const grupos = screen.getAllByRole("group");
    expect(grupos.map((g) => g.getAttribute("aria-label"))).toEqual([
      "Principal",
      "Clientes",
      "Receita",
      "Operação",
      "Equipe Inexci",
    ]);

    const esperados: Record<string, [string, string][]> = {
      Principal: [["Dashboard", "/admin/dashboard"]],
      Clientes: [
        ["Contas", "/admin/clientes"],
        ["Uso da plataforma", "/admin/uso"],
      ],
      Receita: [
        ["Faturamento", "/admin/faturamento"],
        ["Cupons", "/admin/cupons"],
        ["Planos", "/admin/planos"],
        ["Eventos da Stripe", "/admin/stripe"],
      ],
      Operação: [
        ["Uso de IA", "/admin/ia"],
        ["Envios", "/admin/envios"],
        ["Erros", "/admin/erros"],
        ["Filas", "/admin/filas"],
        ["Segurança", "/admin/seguranca"],
        ["Sistema", "/admin/sistema"],
      ],
      "Equipe Inexci": [
        ["Administradores", "/admin/equipe"],
        ["Histórico de ações", "/admin/historico"],
      ],
    };
    for (const grupo of grupos) {
      const nome = grupo.getAttribute("aria-label") as string;
      const links = within(grupo)
        .getAllByRole("link")
        .map((l) => [l.textContent, l.getAttribute("href")]);
      expect(links).toEqual(esperados[nome]);
    }
  });

  it("mostra o selo Admin ao lado da logo", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("marca só o item da rota atual", () => {
    pathname = "/admin/clientes/abc";
    render(<AdminSidebar />);

    const ativos = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("aria-current") === "page");
    expect(ativos.map((l) => l.textContent)).toEqual(["Contas"]);
  });

  it("o Dashboard não fica ativo em subrotas", () => {
    pathname = "/admin/uso";
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("recolhe e lembra a escolha", () => {
    render(<AdminSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Retrair" }));
    expect(
      screen.getByRole("button", { name: "Expandir" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("true");
  });

  it("fecha o drawer ao navegar no mobile", () => {
    const fechar = vi.fn();
    render(<AdminSidebar isMobileOpen onMobileClose={fechar} />);
    fireEvent.click(screen.getByRole("link", { name: "Cupons" }));
    expect(fechar).toHaveBeenCalled();
  });

  it("mostra nome e e-mail do administrador do painel", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("ana@inexci.com")).toBeInTheDocument();
  });

  it("o menu da conta tem Sair", () => {
    render(<AdminSidebar />);
    fireEvent.click(
      screen.getByRole("button", { name: "Menu da conta de Ana Admin" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
