import { test as base, Page } from "@playwright/test";
import { setupAuthMocks, injectAuthSession } from "../helpers/api-mock";
import { mockSurgeryRequestListResponse } from "../mocks/surgery-requests.mocks";
import { mockUser } from "../mocks/auth.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type AuthFixtures = {
  /** Página com usuário autenticado e mocks básicos configurados */
  authenticatedPage: Page;
};

/**
 * Fixture que fornece uma página já autenticada.
 *
 * Uso:
 *   import { test } from "../fixtures/auth.fixture";
 *   test("meu teste", async ({ authenticatedPage }) => { ... });
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Configura mocks de API de autenticação
    await setupAuthMocks(page);

    // Mock da listagem de solicitações (página inicial após login)
    await page.route(`${API_BASE}/surgery-requests`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSurgeryRequestListResponse),
      });
    });

    // Mock de notificações (sidebar/header)
    await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "3" });
    });
    await page.route(`${API_BASE}/notifications**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, unread: 3 }),
      });
    });

    // Navega para a home (que redirecionará para login, pois não tem sessão ainda)
    await page.goto("/login");

    // Injeta sessão diretamente no localStorage
    await injectAuthSession(page, mockUser);

    // Navega para a página principal já autenticada
    await page.goto("/solicitacoes-cirurgicas");

    await use(page);
  },
});

export { expect } from "@playwright/test";
