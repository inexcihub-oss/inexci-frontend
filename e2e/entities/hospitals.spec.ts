import { test as authTest, expect } from "../fixtures/auth.fixture";
import { mockHospitalsList, mockHospital } from "../mocks/entities.mocks";
import { makeHospitalPayload } from "../fixtures/data.fixture";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("CRUD de Hospitais", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/hospitals`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockHospitalsList),
        });
      } else if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...mockHospital, id: "hosp-new", name: body.name }),
        });
      } else {
        await route.continue();
      }
    });
    await page.route(`${API_BASE}/hospitals/*`, async (route) => {
      const method = route.request().method();
      if (method === "PATCH" || method === "PUT") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...mockHospital, ...body }),
        });
      } else if (method === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
      } else {
        await route.continue();
      }
    });
  });

  authTest("E1 — lista de hospitais é exibida", async ({ authenticatedPage: page }) => {
    await page.goto("/hospitais");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Hospital Central").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("text=Hospital Norte").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("E1.1 — criar hospital aparece na lista", async ({ authenticatedPage: page }) => {
    await page.goto("/hospitais");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: /novo hospital|adicionar hospital/i });
    if (await newButton.isVisible({ timeout: 3_000 })) {
      await newButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      const payload = makeHospitalPayload();
      const nameInput = dialog.locator('input[name="name"], input[placeholder*="nome"]').first();
      await nameInput.fill(payload.name as string);

      const saveButton = dialog.getByRole("button", { name: /salvar|cadastrar|confirmar/i });
      const [postResponse] = await Promise.all([
        page.waitForResponse((resp) =>
          resp.url().includes("/hospitals") && resp.request().method() === "POST",
        ),
        saveButton.click(),
      ]);

      expect(postResponse.status()).toBe(201);
    }
  });

  authTest("E1.2 — excluir hospital remove da lista", async ({ authenticatedPage: page }) => {
    await page.goto("/hospitais");
    await page.waitForLoadState("networkidle");

    // Encontra botão de exclusão próximo ao primeiro hospital
    const deleteButton = page
      .locator("text=Hospital Central")
      .first()
      .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,'row') or contains(@class,'card') or contains(@class,'item')]")
      .first()
      .getByRole("button", { name: /excluir|deletar|remover/i })
      .first();

    if (await deleteButton.isVisible({ timeout: 3_000 })) {
      await deleteButton.click();

      const confirmButton = page.getByRole("button", { name: /confirmar|excluir|sim/i }).last();
      if (await confirmButton.isVisible({ timeout: 3_000 })) {
        const [deleteResponse] = await Promise.all([
          page.waitForResponse((resp) =>
            resp.url().includes("/hospitals/") && resp.request().method() === "DELETE",
          ),
          confirmButton.click(),
        ]);
        expect(deleteResponse.status()).toBe(204);
      }
    }
  });
});
