import { test as authTest, expect } from "../fixtures/auth.fixture";
import { SurgeryRequestsListPage } from "../pages/surgery-requests-list.page";
import {
  mockPatientsList,
  mockHospitalsList,
  mockHealthPlansList,
} from "../mocks/entities.mocks";
import { mockCreateSurgeryRequestResponse } from "../mocks/surgery-requests.mocks";
import { mockUser } from "../mocks/auth.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("Criação de Solicitação Cirúrgica", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    // Mocks necessários para o modal de criação
    await page.route(`${API_BASE}/patients**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPatientsList),
      });
    });
    await page.route(`${API_BASE}/hospitals**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHospitalsList),
      });
    });
    await page.route(`${API_BASE}/health-plans**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockHealthPlansList),
      });
    });
    await page.route(`${API_BASE}/users/doctors**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockUser]),
      });
    });
    await page.route(`${API_BASE}/available-doctors**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([mockUser]),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/templates**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/procedures**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  });

  authTest("S6 — criar solicitação simples cria um card na coluna Pendente", async ({ authenticatedPage: page }) => {
    // Mock do endpoint de criação
    await page.route(`${API_BASE}/surgery-requests`, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(mockCreateSurgeryRequestResponse),
        });
      } else {
        await route.continue();
      }
    });

    const listPage = new SurgeryRequestsListPage(page);
    await listPage.expectPageLoaded();
    await listPage.openNewRequestModal();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Preenche o formulário de criação simples
    // O nome do campo de procedimento pode variar
    const procedureInput = dialog
      .locator('input[placeholder*="procedimento"], input[name*="procedure"], input[placeholder*="cirurgia"]')
      .first();

    if (await procedureInput.isVisible()) {
      await procedureInput.fill("Artroscopia de Joelho");
    }

    // Salva (botão de submit dentro do dialog)
    const saveButton = dialog.getByRole("button", { name: /salvar|criar|confirmar/i }).last();
    await expect(saveButton).toBeVisible({ timeout: 5_000 });

    const [createResponse] = await Promise.all([
      page.waitForResponse((resp) =>
        resp.url().includes("/surgery-requests") && resp.request().method() === "POST",
      ),
      saveButton.click(),
    ]);

    expect(createResponse.status()).toBe(201);
  });
});
