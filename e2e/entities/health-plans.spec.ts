import { test as authTest, expect } from "../fixtures/auth.fixture";
import { mockHealthPlansList, mockHealthPlan } from "../mocks/entities.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("CRUD de Convênios", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/health-plans`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockHealthPlansList),
        });
      } else if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...mockHealthPlan, id: "hp-new", name: body.name }),
        });
      } else {
        await route.continue();
      }
    });
    await page.route(`${API_BASE}/health-plans/*`, async (route) => {
      const method = route.request().method();
      if (method === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
      } else {
        await route.continue();
      }
    });
  });

  authTest("E2 — lista de convênios é exibida", async ({ authenticatedPage: page }) => {
    await page.goto("/convenios");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Unimed").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("text=Amil").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("E2.1 — criar convênio dispara POST", async ({ authenticatedPage: page }) => {
    await page.goto("/convenios");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: /novo convênio|adicionar convênio/i });
    if (await newButton.isVisible({ timeout: 3_000 })) {
      await newButton.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      const nameInput = dialog.locator('input[name="name"], input[placeholder*="nome"]').first();
      await nameInput.fill("Bradesco Saúde");

      const saveButton = dialog.getByRole("button", { name: /salvar|cadastrar|confirmar/i });
      const [postResponse] = await Promise.all([
        page.waitForResponse((resp) =>
          resp.url().includes("/health-plans") && resp.request().method() === "POST",
        ),
        saveButton.click(),
      ]);
      expect(postResponse.status()).toBe(201);
    }
  });
});
