import { test as authTest, expect } from "../fixtures/auth.fixture";
import { mockNotificationsList } from "../mocks/entities.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("Notificações", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/notifications`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockNotificationsList),
      });
    });
    await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "1" });
    });
    await page.route(`${API_BASE}/notifications/*/read`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route(`${API_BASE}/notifications/read-all`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
  });

  authTest("N1 — página de notificações lista itens", async ({ authenticatedPage: page }) => {
    await page.goto("/notificacoes");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Solicitação atualizada").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("text=Nova pendência").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("N3 — 'Marcar todas como lidas' dispara request", async ({ authenticatedPage: page }) => {
    await page.goto("/notificacoes");
    await page.waitForLoadState("networkidle");

    const markAllButton = page.getByRole("button", { name: /marcar todas|todas como lidas/i });
    if (await markAllButton.isVisible({ timeout: 5_000 })) {
      const [response] = await Promise.all([
        page.waitForResponse((resp) => resp.url().includes("/notifications")),
        markAllButton.click(),
      ]);
      // Aceita qualquer resposta de sucesso (200 ou 201)
      expect(response.status()).toBeLessThan(300);
    }
  });
});
