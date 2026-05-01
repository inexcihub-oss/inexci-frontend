import { test as authTest, expect } from "../fixtures/auth.fixture";
import { SurgeryRequestsListPage } from "../pages/surgery-requests-list.page";
import { mockSurgeryRequestListResponse } from "../mocks/surgery-requests.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

authTest.describe("Listagem de Solicitações Cirúrgicas", () => {
  authTest("S1 — página carrega e exibe solicitações em modo kanban", async ({ authenticatedPage: page }) => {
    const listPage = new SurgeryRequestsListPage(page);

    // A fixture já navega para /solicitacoes-cirurgicas
    await listPage.expectPageLoaded();

    // Verifica que dados são exibidos (pacientes do mock)
    await expect(page.locator("text=João Silva").first()).toBeVisible({ timeout: 8_000 });
  });

  authTest("S2 — alternância entre modo lista e kanban", async ({ authenticatedPage: page }) => {
    const listPage = new SurgeryRequestsListPage(page);
    await listPage.expectPageLoaded();

    // Tenta alternar para o modo lista
    if (await listPage.listViewButton.isVisible()) {
      await listPage.switchToListView();
      // Em modo lista, deve aparecer uma tabela ou estrutura de linhas
      const tableOrRows = page.locator("table, [role='table'], [role='row']").first();
      await expect(tableOrRows).toBeVisible({ timeout: 5_000 });

      // Volta para kanban
      if (await listPage.kanbanViewButton.isVisible()) {
        await listPage.switchToKanbanView();
      }
    }
  });

  authTest("S5 — botão 'Nova Solicitação' abre modal de criação", async ({ authenticatedPage: page }) => {
    // Mock de endpoints necessários para o modal
    await page.route(`${API_BASE}/patients**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/doctors**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/templates**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    const listPage = new SurgeryRequestsListPage(page);
    await listPage.expectPageLoaded();
    await listPage.openNewRequestModal();

    // Modal deve estar visível
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  authTest("S7 — clicar em card navega para /solicitacao/[id]", async ({ authenticatedPage: page }) => {
    // Mock do detalhe da solicitação
    await page.route(`${API_BASE}/surgery-requests/1`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSurgeryRequestListResponse[0]),
      });
    });
    await page.route(`${API_BASE}/surgery-requests/1/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    const listPage = new SurgeryRequestsListPage(page);
    await listPage.expectPageLoaded();

    // Clica no paciente João Silva (primeiro card)
    const card = page.locator("text=João Silva").first();
    await expect(card).toBeVisible({ timeout: 8_000 });
    await card.click();

    // Deve navegar para a página de detalhe
    await expect(page).toHaveURL(/\/solicitacao\/\d+/, { timeout: 10_000 });
  });
});
