import { test, expect } from "@playwright/test";
import { setupAuthMocks, injectAuthSession } from "../helpers/api-mock";
import { mockSurgeryRequestListResponse } from "../mocks/surgery-requests.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

test.describe("Logout", () => {
  test("A8 — logout limpa sessão e redireciona para /login", async ({ page }) => {
    // Arrange: usuário autenticado
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

    await page.goto("/login");
    await injectAuthSession(page);
    await page.goto("/solicitacoes-cirurgicas");

    // Aguarda a página carregar
    await page.waitForLoadState("networkidle");

    // Act: encontra e clica no botão de logout
    // O botão de logout pode estar no menu do usuário — tenta abrir o dropdown primeiro
    const userMenuButton = page
      .getByRole("button", { name: /perfil|usuário|menu|sair/i })
      .first();

    const logoutButton = page.getByRole("button", { name: /sair|logout/i });

    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
    }

    await expect(logoutButton).toBeVisible({ timeout: 5_000 });
    await logoutButton.click();

    // Assert: redireciona para login
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });

    // Assert: localStorage limpo
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });

  test("A8.1 — após logout, acesso a rota protegida redireciona para /login", async ({ page }) => {
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

    await page.goto("/login");
    await injectAuthSession(page);
    await page.goto("/solicitacoes-cirurgicas");
    await page.waitForLoadState("networkidle");

    // Remove a sessão diretamente (simula expiração/logout externo)
    await page.evaluate(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    });

    // Tenta navegar para rota protegida
    await page.goto("/solicitacoes-cirurgicas");

    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });
});
