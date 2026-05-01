import { test as authTest, expect } from "../fixtures/auth.fixture";
import { SurgeryRequestDetailPage } from "../pages/surgery-request-detail.page";
import { mockSurgeryRequestDetail } from "../mocks/surgery-requests.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("Detalhe da Solicitação Cirúrgica", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    // Mocks de todos os sub-endpoints da página de detalhe
    await page.route(`${API_BASE}/surgery-requests/1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSurgeryRequestDetail),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/1/activities`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/1/documents`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/1/sections`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/pendencies/validate/1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ canTransition: false, pendencies: [] }),
      });
    });
    await page.route(`${API_BASE}/pendencies/summary/1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 2,
          completed: 0,
          pending: 2,
          waiting: 0,
          optional: 0,
          canTransition: false,
          grouped: { pending: [], completed: [], waiting: [], optional: [] },
        }),
      });
    });
  });

  authTest("D1 — exibe informações básicas da solicitação", async ({ authenticatedPage: page }) => {
    const detailPage = new SurgeryRequestDetailPage(page);
    await detailPage.goto(1);
    await detailPage.expectPageLoaded(1);

    // Protocolo ou ID deve estar visível
    const protocolOrId = page.locator("text=/000001|#1/i").first();
    await expect(protocolOrId).toBeVisible({ timeout: 8_000 });

    // Nome do paciente
    await expect(page.locator("text=João Silva").first()).toBeVisible({ timeout: 5_000 });

    // Nome do médico
    await expect(page.locator("text=/Dr. Admin|Admin Teste/i").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("D1.1 — exibe status correto (Pendente)", async ({ authenticatedPage: page }) => {
    const detailPage = new SurgeryRequestDetailPage(page);
    await detailPage.goto(1);
    await detailPage.expectPageLoaded(1);

    // Status "Pendente" deve estar visível em algum badge/label
    await expect(page.locator("text=Pendente").first()).toBeVisible({ timeout: 8_000 });
  });

  authTest("D1.2 — exibe nome do hospital e convênio", async ({ authenticatedPage: page }) => {
    const detailPage = new SurgeryRequestDetailPage(page);
    await detailPage.goto(1);
    await detailPage.expectPageLoaded(1);

    await expect(page.locator("text=Hospital Central").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("text=Unimed").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("D1.3 — exibe nome do procedimento", async ({ authenticatedPage: page }) => {
    const detailPage = new SurgeryRequestDetailPage(page);
    await detailPage.goto(1);
    await detailPage.expectPageLoaded(1);

    await expect(page.locator("text=Artroscopia de Joelho").first()).toBeVisible({ timeout: 5_000 });
  });
});
