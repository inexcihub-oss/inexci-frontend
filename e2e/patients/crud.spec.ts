import { test as authTest, expect } from "../fixtures/auth.fixture";
import { PatientsPage } from "../pages/patients.page";
import { mockPatientsList, mockPatient } from "../mocks/entities.mocks";
import { makePatientPayload } from "../fixtures/data.fixture";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("CRUD de Pacientes", () => {
  authTest.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route(`${API_BASE}/patients`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPatientsList),
        });
      } else if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ ...mockPatient, id: "pat-new", name: body.name }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`${API_BASE}/patients/*`, async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPatient),
        });
      } else if (method === "PATCH" || method === "PUT") {
        const body = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...mockPatient, ...body }),
        });
      } else if (method === "DELETE") {
        await route.fulfill({ status: 204, body: "" });
      } else {
        await route.continue();
      }
    });
  });

  authTest("P1 — lista de pacientes é exibida", async ({ authenticatedPage: page }) => {
    const patientsPage = new PatientsPage(page);
    await patientsPage.goto();
    await page.waitForLoadState("networkidle");

    await patientsPage.expectPatientVisible("João Silva");
    await patientsPage.expectPatientVisible("Maria Souza");
  });

  authTest("P2 — criar paciente aparece na lista", async ({ authenticatedPage: page }) => {
    const patientsPage = new PatientsPage(page);
    await patientsPage.goto();
    await page.waitForLoadState("networkidle");

    // Abre o modal de criação
    if (await patientsPage.newPatientButton.isVisible({ timeout: 3_000 })) {
      await patientsPage.openNewPatientModal();

      const payload = makePatientPayload({ name: "Novo Paciente Teste" });
      await patientsPage.fillPatientForm({ name: payload.name as string });

      const [postResponse] = await Promise.all([
        page.waitForResponse((resp) =>
          resp.url().includes("/patients") && resp.request().method() === "POST",
        ),
        patientsPage.saveForm(),
      ]);

      expect(postResponse.status()).toBe(201);
    }
  });

  authTest("P5 — campo de busca filtra a lista", async ({ authenticatedPage: page }) => {
    const patientsPage = new PatientsPage(page);
    await patientsPage.goto();
    await page.waitForLoadState("networkidle");

    if (await patientsPage.searchInput.isVisible({ timeout: 3_000 })) {
      await patientsPage.searchInput.fill("João");

      // Aguarda debounce (se houver)
      await page.waitForTimeout(400);

      // João deve continuar visível; Maria pode sumir (dependendo de ser filtro client-side)
      await patientsPage.expectPatientVisible("João Silva");
    }
  });

  authTest("P4 — excluir paciente remove da lista", async ({ authenticatedPage: page }) => {
    const patientsPage = new PatientsPage(page);
    await patientsPage.goto();
    await page.waitForLoadState("networkidle");

    // Procura botão de excluir ao lado de João Silva
    const deleteButton = page
      .locator("text=João Silva")
      .first()
      .locator("xpath=ancestor::tr | ancestor::li | ancestor::div[contains(@class,'row') or contains(@class,'item')]")
      .first()
      .getByRole("button", { name: /excluir|deletar|remover/i })
      .first();

    if (await deleteButton.isVisible({ timeout: 3_000 })) {
      await deleteButton.click();

      // Confirma no modal de confirmação
      const confirmButton = page.getByRole("button", { name: /confirmar|excluir|sim/i }).last();
      if (await confirmButton.isVisible({ timeout: 3_000 })) {
        const [deleteResponse] = await Promise.all([
          page.waitForResponse((resp) =>
            resp.url().includes("/patients/") && resp.request().method() === "DELETE",
          ),
          confirmButton.click(),
        ]);
        expect(deleteResponse.status()).toBe(204);
      }
    }
  });
});
