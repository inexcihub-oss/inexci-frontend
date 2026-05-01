import { test as authTest, expect } from "../fixtures/auth.fixture";
import {
  mockSurgeryRequestListResponse,
  mockSurgeryRequestDetail,
  mockSurgeryRequestSentDetail,
} from "../mocks/surgery-requests.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * T2.5 — Navegação entre listagem e detalhe da solicitação.
 * Cobre: abertura de cards, back navigation, deep links e URLs diretas.
 */

async function setupDetailMocks(page: import("@playwright/test").Page, id: number, detail = mockSurgeryRequestDetail) {
  await page.route(`${API_BASE}/surgery-requests/${id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(detail),
    });
  });
  for (const sub of ["activities", "documents", "sections"]) {
    await page.route(`${API_BASE}/surgery-requests/${id}/${sub}`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
  }
  await page.route(`${API_BASE}/pendencies/**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ canTransition: false, total: 0, pending: 0, completed: 0, waiting: 0, optional: 0 }),
    });
  });
}

authTest.describe("Navegação entre Listagem e Detalhe", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/surgery-requests`, async (route) => {
      if (route.request().method() === "GET" && !route.request().url().includes("/surgery-requests/")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockSurgeryRequestListResponse),
        });
      } else {
        await route.continue();
      }
    });
    await setupDetailMocks(page, 1);
    await setupDetailMocks(page, 2, mockSurgeryRequestSentDetail);
  });

  authTest("S7 — clicar em card navega para /solicitacao/[id]", async ({ authenticatedPage: page }) => {
    await page.waitForLoadState("networkidle");

    const card = page.locator("text=João Silva").first();
    await expect(card).toBeVisible({ timeout: 8_000 });
    await card.click();

    await expect(page).toHaveURL(/\/solicitacao\/\d+/, { timeout: 10_000 });
  });

  authTest("URL direta /solicitacao/1 carrega o detalhe correto", async ({ authenticatedPage: page }) => {
    await page.goto("/solicitacao/1");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/solicitacao/1");
    await expect(page.locator("text=João Silva").first()).toBeVisible({ timeout: 8_000 });
  });

  authTest("URL direta /solicitacao/2 carrega outra solicitação (status Enviada)", async ({ authenticatedPage: page }) => {
    await page.goto("/solicitacao/2");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/solicitacao/2");
    // Status da segunda solicitação é "Enviada" (status: 2)
    await expect(page.locator("text=Enviada").first()).toBeVisible({ timeout: 8_000 });
  });

  authTest("botão voltar retorna para a listagem", async ({ authenticatedPage: page }) => {
    // Navega para o detalhe
    await page.goto("/solicitacao/1");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/solicitacao/1");

    // Clica em voltar (botão ou link de breadcrumb)
    const backButton = page
      .getByRole("link", { name: /voltar|solicitações/i })
      .or(page.getByRole("button", { name: /voltar/i }))
      .first();

    if (await backButton.isVisible({ timeout: 3_000 })) {
      await backButton.click();
      await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });
    } else {
      // Usa o back do browser
      await page.goBack();
      await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });
    }
  });

  authTest("ID inexistente exibe página de erro ou redireciona", async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/surgery-requests/9999`, async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: '{"message":"Not Found"}' });
    });

    await page.goto("/solicitacao/9999");
    await page.waitForLoadState("networkidle");

    // A página deve exibir algum indicador de erro (mensagem, redirecionamento ou 404)
    const hasErrorIndicator =
      (await page.locator("text=/não encontrad|not found|erro|404/i").first().isVisible({ timeout: 5_000 }).catch(() => false)) ||
      (await page.url().includes("/solicitacoes-cirurgicas"));

    expect(hasErrorIndicator).toBe(true);
  });
});
