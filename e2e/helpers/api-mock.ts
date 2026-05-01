import { Page, Route } from "@playwright/test";
import { mockLoginSuccessResponse, mockLoginErrorResponse, mockMeResponse } from "../mocks/auth.mocks";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type MockOptions = {
  status?: number;
  body: unknown;
  delay?: number;
};

/**
 * Intercepta uma rota de API e retorna um mock.
 * Usa glob patterns do Playwright para flexibilidade.
 */
export async function mockRoute(page: Page, urlPattern: string, options: MockOptions) {
  await page.route(`${API_BASE}${urlPattern}`, async (route: Route) => {
    if (options.delay) await new Promise((r) => setTimeout(r, options.delay));
    await route.fulfill({
      status: options.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(options.body),
    });
  });
}

/**
 * Configura mocks padrão de autenticação (necessários em quase todos os testes).
 */
export async function setupAuthMocks(page: Page) {
  await mockRoute(page, "/auth/login", { body: mockLoginSuccessResponse });
  await mockRoute(page, "/auth/me", { body: mockMeResponse });
  await mockRoute(page, "/auth/logout", { body: { message: "ok" } });
  await mockRoute(page, "/auth/refresh", { body: mockLoginSuccessResponse });
}

/**
 * Simula falha de autenticação.
 */
export async function setupAuthErrorMock(page: Page) {
  await mockRoute(page, "/auth/login", {
    status: 401,
    body: mockLoginErrorResponse,
  });
}

/**
 * Injeta token e usuário no localStorage, simulando sessão autenticada.
 * Deve ser chamado APÓS page.goto() para garantir que o contexto da página existe.
 */
export async function injectAuthSession(page: Page, user = mockMeResponse) {
  const { cpf, ...userWithoutCpf } = user as typeof user & { cpf?: string };
  void cpf; // removido intencionalmente (igual ao authService real)

  await page.evaluate((storedUser) => {
    localStorage.setItem("token", "mock-jwt-token-valid-12345");
    localStorage.setItem("token_timestamp", Date.now().toString());
    localStorage.setItem("user", JSON.stringify(storedUser));
  }, userWithoutCpf);
}

/**
 * Remove sessão do localStorage.
 */
export async function clearAuthSession(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("token_timestamp");
    localStorage.removeItem("user");
  });
}

/**
 * Helper para aguardar uma resposta de API interceptada.
 */
export function waitForApiCall(page: Page, urlFragment: string, method = "GET") {
  return page.waitForResponse(
    (resp) =>
      resp.url().includes(urlFragment) &&
      resp.request().method() === method,
    { timeout: 10_000 },
  );
}
