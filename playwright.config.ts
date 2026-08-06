import { defineConfig, devices } from "@playwright/test";

/**
 * Suíte e2e de interface — fecha a lacuna AU-09 do
 * `PLANO-TESTES-ATENDIMENTO-AGENDA.md` (agenda + atendimento sem cobertura de
 * ponta a ponta pela UI).
 *
 * Roda contra uma aplicação **já no ar** (frontend 3001 + API 3002), com o
 * banco de desenvolvimento semeado por `yarn seed`. Não sobe servidor sozinha
 * de propósito: `next build` e `next dev` disputam o mesmo `.next` e um derruba
 * o outro no meio da execução.
 *
 * Os arquivos terminam em `.e2e.ts` para não serem varridos pelo Vitest, cujo
 * `include` é `**\/*.{test,spec}.{ts,tsx}`.
 *
 * Não há `storageState`: a sessão se apoia no cookie httpOnly de refresh, que é
 * rotacionado a cada uso e tem detecção de reuso — reaproveitar o mesmo estado
 * em contextos diferentes revoga a família de tokens. Cada arquivo abre a sua
 * sessão uma vez (`abrirSessao`) e compartilha a página entre os testes.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  // Sequencial: os testes compartilham o banco de desenvolvimento e a agenda
  // do mesmo médico — paralelizar produziria conflito de horário entre eles.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "line" : [["list"]],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [
    {
      name: "atendimento",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
