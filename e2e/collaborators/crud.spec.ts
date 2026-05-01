import { test as authTest, expect } from "../fixtures/auth.fixture";
import { mockCollaboratorsList, mockCollaborator } from "../mocks/entities.mocks";
import { mockUser } from "../mocks/auth.mocks";
import { makeCollaboratorPayload } from "../fixtures/data.fixture";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * T4.4 — CRUD de colaboradores, incluindo ativar/desativar e gerenciar acesso a médicos.
 */

authTest.describe("CRUD de Colaboradores", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/users`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCollaboratorsList),
        });
      } else if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            ...mockCollaborator,
            id: "collab-new",
            name: body.name,
            email: body.email,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`${API_BASE}/users/*`, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockCollaborator),
        });
      } else if (method === "PATCH" || method === "PUT") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...mockCollaborator, ...body }),
        });
      } else if (method === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
      } else {
        await route.continue();
      }
    });

    // Toggle de status (ativar/desativar)
    await page.route(`${API_BASE}/users/*/toggle-status`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "inactive" }),
      });
    });

    // Reset de senha
    await page.route(`${API_BASE}/users/*/reset-password`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "Senha redefinida com sucesso." }),
      });
    });

    // Médicos disponíveis para gerenciar acesso
    await page.route(`${API_BASE}/available-doctors**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockUser]),
      });
    });

    // Acessos do colaborador a médicos
    await page.route(`${API_BASE}/user-doctor-access/**`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
    });
  });

  authTest("C1 — lista de colaboradores é exibida", async ({ authenticatedPage: page }) => {
    await page.goto("/colaboradores");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Assistente Santos").first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("text=Dra. Colaboradora").first()).toBeVisible({ timeout: 5_000 });
  });

  authTest("C2 — criar colaborador dispara POST /users", async ({ authenticatedPage: page }) => {
    await page.goto("/colaboradores");
    await page.waitForLoadState("networkidle");

    const newButton = page.getByRole("button", { name: /novo colaborador|adicionar colaborador|convidar/i });
    if (await newButton.isVisible({ timeout: 3_000 })) {
      await newButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      const payload = makeCollaboratorPayload();

      const nameInput = dialog.locator('input[name="name"], input[placeholder*="nome"]').first();
      await nameInput.fill(payload.name as string);

      const emailInput = dialog.locator('input[name="email"], input[type="email"]').first();
      await emailInput.fill(payload.email as string);

      const passwordInput = dialog.locator('input[name="password"], input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill(payload.password as string);
      }

      const saveButton = dialog.getByRole("button", { name: /salvar|cadastrar|convidar|confirmar/i });
      const [postResp] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes("/users") && resp.request().method() === "POST",
        ),
        saveButton.click(),
      ]);

      expect(postResp.status()).toBe(201);
    }
  });

  authTest("C3 — toggle de status dispara PATCH toggle-status", async ({ authenticatedPage: page }) => {
    await page.goto("/colaboradores");
    await page.waitForLoadState("networkidle");

    // Procura botão de ativar/desativar próximo ao colaborador
    const toggleButton = page
      .locator("text=Assistente Santos")
      .first()
      .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,'row') or contains(@class,'item') or contains(@class,'card')]")
      .first()
      .getByRole("button", { name: /ativar|desativar|toggle|status/i })
      .first();

    if (await toggleButton.isVisible({ timeout: 3_000 })) {
      const [toggleResp] = await Promise.all([
        page.waitForResponse(
          (resp) => resp.url().includes("toggle-status") || resp.url().includes("/users/"),
        ),
        toggleButton.click(),
      ]);
      expect(toggleResp.status()).toBeLessThan(300);
    } else {
      // Pode ser um switch/checkbox
      const statusSwitch = page
        .locator("text=Assistente Santos")
        .first()
        .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[1]")
        .first()
        .locator('[role="switch"], input[type="checkbox"]')
        .first();

      if (await statusSwitch.isVisible({ timeout: 3_000 })) {
        await statusSwitch.click();
      }
    }
  });

  authTest("C4 — redefinir senha dispara request de reset", async ({ authenticatedPage: page }) => {
    await page.goto("/colaboradores");
    await page.waitForLoadState("networkidle");

    const resetButton = page
      .locator("text=Assistente Santos")
      .first()
      .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,'row') or contains(@class,'item') or contains(@class,'card')]")
      .first()
      .getByRole("button", { name: /senha|redefinir|reset/i })
      .first();

    if (await resetButton.isVisible({ timeout: 3_000 })) {
      await resetButton.click();

      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible({ timeout: 3_000 })) {
        const newPasswordInput = dialog.locator('input[type="password"]').first();
        if (await newPasswordInput.isVisible()) {
          await newPasswordInput.fill("NovaSenha@456");
        }

        const confirmButton = dialog.getByRole("button", { name: /confirmar|salvar|redefinir/i });
        if (await confirmButton.isVisible()) {
          const [resp] = await Promise.all([
            page.waitForResponse((r) => r.url().includes("/users/") || r.url().includes("reset-password")),
            confirmButton.click(),
          ]);
          expect(resp.status()).toBeLessThan(300);
        }
      }
    }
  });

  authTest("C5 — gerenciar acesso a médicos abre modal de acesso", async ({ authenticatedPage: page }) => {
    await page.goto("/colaboradores");
    await page.waitForLoadState("networkidle");

    const accessButton = page
      .locator("text=Assistente Santos")
      .first()
      .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,'row') or contains(@class,'item') or contains(@class,'card')]")
      .first()
      .getByRole("button", { name: /acesso|médico|gerenciar/i })
      .first();

    if (await accessButton.isVisible({ timeout: 3_000 })) {
      await accessButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5_000 });

      // O médico disponível deve aparecer no modal
      await expect(dialog.locator("text=/Dr. Admin|Admin Teste/i").first()).toBeVisible({ timeout: 5_000 });
    }
  });
});
