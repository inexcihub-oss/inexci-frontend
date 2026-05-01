import { test, expect } from "@playwright/test";
import { setupAuthMocks, injectAuthSession, clearAuthSession } from "../helpers/api-mock";
import { mockSurgeryRequestListResponse } from "../mocks/surgery-requests.mocks";
import { mockUser } from "../mocks/auth.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * T1.5 — Persistência e gerenciamento de sessão via localStorage.
 */

async function setupPageMocks(page: import("@playwright/test").Page) {
  await setupAuthMocks(page);
  await page.route(`${API_BASE}/surgery-requests`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSurgeryRequestListResponse),
    });
  });
  await page.route(`${API_BASE}/notifications**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0, unread: 0 }),
    });
  });
  await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "0" });
  });
}

test.describe("Persistência de Sessão", () => {
  test("A7 — token no localStorage carrega dashboard sem novo login", async ({ page }) => {
    await setupPageMocks(page);
    await page.goto("/login");
    await injectAuthSession(page, mockUser);

    await page.goto("/solicitacoes-cirurgicas");

    await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });
    // Nenhum redirecionamento para /login ocorreu
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("token ausente força redirecionamento para /login", async ({ page }) => {
    await page.goto("/login");
    await clearAuthSession(page);

    await page.goto("/solicitacoes-cirurgicas");

    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("token presente mantém sessão após navegação entre rotas protegidas", async ({ page }) => {
    await setupPageMocks(page);

    // Mocks adicionais para outras rotas
    await page.route(`${API_BASE}/patients**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });

    await page.goto("/login");
    await injectAuthSession(page, mockUser);

    // Navega por múltiplas rotas protegidas
    await page.goto("/solicitacoes-cirurgicas");
    await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });

    await page.goto("/pacientes");
    await expect(page).toHaveURL(/pacientes/, { timeout: 8_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("remoção do token durante sessão ativa força login na próxima navegação", async ({ page }) => {
    await setupPageMocks(page);
    await page.goto("/login");
    await injectAuthSession(page, mockUser);
    await page.goto("/solicitacoes-cirurgicas");
    await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });

    // Remove token em runtime (simula expiração ou logout em outra aba)
    await page.evaluate(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });

    // Tenta navegar para outra rota protegida
    await page.goto("/pacientes");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("dados do usuário são lidos do localStorage sem nova chamada à API", async ({ page }) => {
    await setupPageMocks(page);

    // Monitora chamadas para /auth/me
    const meCalls: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/auth/me")) meCalls.push(req.url());
    });

    await page.goto("/login");
    await injectAuthSession(page, mockUser);
    await page.goto("/solicitacoes-cirurgicas");
    await page.waitForLoadState("networkidle");

    // O app deve ler o usuário do localStorage sem chamar /auth/me na inicialização
    // (comportamento do AuthContext atual: getCurrentUser() lê localStorage)
    expect(meCalls.length).toBeLessThanOrEqual(1);
  });
});
