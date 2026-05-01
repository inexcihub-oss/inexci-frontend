import { test as authTest, expect } from "../fixtures/auth.fixture";
import { mockDashboardData } from "../mocks/entities.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("Dashboard Analytics", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/reports/dashboard**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboardData),
      });
    });
    await page.route(`${API_BASE}/reports/temporal-evolution**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route(`${API_BASE}/reports/monthly-evolution**`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.route(`${API_BASE}/reports/average-completion-time**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ average_days: 5.2 }),
      });
    });
    await page.route(`${API_BASE}/reports/pending-notifications**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ total: 3 }),
      });
    });
  });

  authTest("R1 — dashboard carrega e exibe métricas", async ({ authenticatedPage: page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Verifica que a página existe e carregou (não tem erro 404 ou spinner infinito)
    await expect(page).toHaveURL(/dashboard/);

    // Deve mostrar algum número ou card de métrica
    const metricElements = page.locator('[data-testid*="metric"], [class*="metric"], [class*="card"], [class*="stat"]');
    const count = await metricElements.count();

    if (count > 0) {
      await expect(metricElements.first()).toBeVisible({ timeout: 8_000 });
    } else {
      // Verifica que pelo menos algum número visível (total = 10 no mock)
      const numberVisible = page.locator("text=10").first();
      await expect(numberVisible).toBeVisible({ timeout: 8_000 });
    }
  });
});
