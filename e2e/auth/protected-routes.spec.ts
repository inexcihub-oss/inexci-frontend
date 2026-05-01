import { test, expect } from "@playwright/test";
import { clearAuthSession } from "../helpers/api-mock";

/**
 * T1.3 — Rotas protegidas redirecionam para /login quando não há sessão ativa.
 * Estes testes NÃO usam a fixture authenticatedPage para garantir que o
 * localStorage está vazio e o middleware de auth do Next.js atua corretamente.
 */

const PROTECTED_ROUTES = [
  "/solicitacoes-cirurgicas",
  "/dashboard",
  "/pacientes",
  "/hospitais",
  "/convenios",
  "/fornecedores",
  "/colaboradores",
  "/notificacoes",
  "/configuracoes",
];

test.describe("Rotas Protegidas — sem autenticação", () => {
  test.beforeEach(async ({ page }) => {
    // Garante localStorage limpo antes de cada teste
    await page.goto("/login");
    await clearAuthSession(page);
  });

  for (const route of PROTECTED_ROUTES) {
    test(`acesso a ${route} sem token redireciona para /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
    });
  }

  test("rota dinâmica /solicitacao/[id] sem token redireciona para /login", async ({ page }) => {
    await page.goto("/solicitacao/999");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("rota de paciente /pacientes/[id] sem token redireciona para /login", async ({ page }) => {
    await page.goto("/pacientes/pat-001");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("página /login não redireciona (rota pública)", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Formulário de login deve estar visível
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 5_000 });
  });

  test("página /cadastro não redireciona (rota pública)", async ({ page }) => {
    await page.goto("/cadastro");
    // Cadastro é público — não deve redirecionar para login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
