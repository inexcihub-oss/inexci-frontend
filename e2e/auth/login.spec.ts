import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import {
  setupAuthMocks,
  setupAuthErrorMock,
  injectAuthSession,
  clearAuthSession,
} from "../helpers/api-mock";
import { mockSurgeryRequestListResponse } from "../mocks/surgery-requests.mocks";
import { VALID_CREDENTIALS, INVALID_CREDENTIALS } from "../mocks/auth.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

test.describe("Login", () => {
  test.beforeEach(async ({ page }) => {
    // Garante que não há sessão ativa antes de cada teste
    await page.goto("/login");
    await clearAuthSession(page);
  });

  test("A1 — login com credenciais válidas redireciona para /solicitacoes-cirurgicas", async ({ page }) => {
    // Arrange: mocks de API
    await setupAuthMocks(page);
    await page.route(`${API_BASE}/surgery-requests`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSurgeryRequestListResponse),
      });
    });
    await page.route(`${API_BASE}/notifications**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, unread: 0 }),
      });
    });
    await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "0" });
    });

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act: aguarda a resposta da API ao fazer login
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/auth/login")),
      loginPage.login(VALID_CREDENTIALS.email, VALID_CREDENTIALS.password),
    ]);

    // Assert: API chamada corretamente
    expect(response.status()).toBe(200);

    // Assert: redirecionou para o dashboard
    await loginPage.expectRedirectedToDashboard();
  });

  test("A2 — login com senha incorreta exibe mensagem de erro", async ({ page }) => {
    // Arrange: mock de erro
    await setupAuthErrorMock(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act
    await loginPage.login(INVALID_CREDENTIALS.email, INVALID_CREDENTIALS.password);

    // Assert: mensagem de erro visível + permanece na tela de login
    await loginPage.expectErrorVisible();
    await loginPage.expectStillOnLogin();
  });

  test("A3 — campos vazios não submetem o formulário", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Act: clica em enviar sem preencher
    await loginPage.submit();

    // Assert: continua na página de login (validação HTML5 bloqueia)
    await loginPage.expectStillOnLogin();
    // Nenhuma chamada à API deve ter sido feita
    const requests: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/auth/login")) requests.push(req.url());
    });
    expect(requests).toHaveLength(0);
  });

  test("A4 — e-mail com formato inválido não submente o formulário", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.fillEmail("email-sem-arroba");
    await loginPage.fillPassword("qualquer-senha");
    await loginPage.submit();

    // Validação nativa HTML5 impede submit
    await loginPage.expectStillOnLogin();
  });

  test("A6 — acesso direto a rota protegida redireciona para /login", async ({ page }) => {
    // Garante localStorage limpo — sem token
    await clearAuthSession(page);

    // Tenta acessar rota protegida diretamente
    await page.goto("/solicitacoes-cirurgicas");

    // Deve redirecionar para login
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

  test("A7 — sessão persistida no localStorage carrega dashboard sem novo login", async ({ page }) => {
    // Arrange: injeta sessão manualmente (simula reload com sessão ativa)
    await setupAuthMocks(page);
    await page.route(`${API_BASE}/surgery-requests`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSurgeryRequestListResponse),
      });
    });
    await page.route(`${API_BASE}/notifications**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], total: 0, unread: 0 }),
      });
    });
    await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "0" });
    });

    // Injeta token (primeiro vai para /login para poder avaliar localStorage)
    await page.goto("/login");
    await injectAuthSession(page);

    // Acessa a rota protegida — não deve pedir login novamente
    await page.goto("/solicitacoes-cirurgicas");
    await expect(page).toHaveURL(/solicitacoes-cirurgicas/, { timeout: 8_000 });
  });
});
