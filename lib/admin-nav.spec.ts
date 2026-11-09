import { describe, it, expect } from "vitest";
import {
  ADMIN_NAV_SECTIONS,
  buildAdminLoginUrl,
  isAdminPublicPath,
  isAdminRouteActive,
  resolveAdminNext,
} from "./admin-nav";

describe("admin-nav", () => {
  it("segue as seções e itens do desenho", () => {
    expect(
      ADMIN_NAV_SECTIONS.map((s) => [s.label, s.items.map((i) => i.label)]),
    ).toEqual([
      [null, ["Dashboard"]],
      ["Clientes", ["Contas", "Uso da plataforma"]],
      ["Receita", ["Faturamento", "Cupons", "Planos", "Eventos da Stripe"]],
      [
        "Operação",
        ["Uso de IA", "Envios", "Erros", "Filas", "Segurança", "Sistema"],
      ],
      ["Equipe Inexci", ["Administradores", "Histórico de ações"]],
    ]);
  });

  it("usa os caminhos do painel", () => {
    expect(
      ADMIN_NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href)),
    ).toEqual([
      "/admin/dashboard",
      "/admin/clientes",
      "/admin/uso",
      "/admin/faturamento",
      "/admin/cupons",
      "/admin/planos",
      "/admin/stripe",
      "/admin/ia",
      "/admin/envios",
      "/admin/erros",
      "/admin/filas",
      "/admin/seguranca",
      "/admin/sistema",
      "/admin/equipe",
      "/admin/historico",
    ]);
  });

  it("o Dashboard não fica ativo nas outras telas", () => {
    expect(isAdminRouteActive("/admin/dashboard", "/admin/dashboard")).toBe(
      true,
    );
    expect(isAdminRouteActive("/admin/clientes", "/admin/dashboard")).toBe(
      false,
    );
    expect(isAdminRouteActive("/admin/clientes/abc", "/admin/clientes")).toBe(
      true,
    );
  });

  it("login e primeiro acesso são as rotas públicas do painel", () => {
    expect(isAdminPublicPath("/admin/login")).toBe(true);
    expect(isAdminPublicPath("/admin/primeiro-acesso")).toBe(true);
    expect(isAdminPublicPath("/admin/loginx")).toBe(false);
    expect(isAdminPublicPath("/admin/clientes")).toBe(false);
  });

  it("next só aceita caminhos internos do painel", () => {
    expect(resolveAdminNext(null)).toBe("/admin/dashboard");
    expect(resolveAdminNext("/admin/clientes?situacao=trial")).toBe(
      "/admin/clientes?situacao=trial",
    );
    for (const ruim of [
      "https://evil.com",
      "//evil.com",
      "/admin//evil.com",
      "/admin\\evil",
      "/dashboard",
      "/administrador",
      "/admin",
      "/admin/login",
      "/admin/primeiro-acesso",
      "javascript:alert(1)",
    ]) {
      expect(resolveAdminNext(ruim)).toBe("/admin/dashboard");
    }
  });

  it("monta a URL do login com a rota de volta codificada", () => {
    expect(buildAdminLoginUrl("/admin/uso?de=1")).toBe(
      "/admin/login?next=%2Fadmin%2Fuso%3Fde%3D1",
    );
  });
});
