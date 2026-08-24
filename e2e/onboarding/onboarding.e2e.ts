import { test, expect, BrowserContext, Page } from "@playwright/test";
import {
  ApiSession,
  loginApi,
  onboardingState,
  resetOnboarding,
} from "../helpers/api";
import { abrirSessao } from "../helpers/ui";

/**
 * PLANO-ONBOARDING.md §7 — os três cenários de Playwright do onboarding:
 * modal de boas-vindas na primeira vez, "Refazer" pela aba de Configurações
 * e a trilha `solicitacoes` do começo ao fim.
 *
 * Roda contra o ambiente local com o seed aplicado (usuário
 * `medico@inexci.com`), como o restante da suíte `e2e/`.
 */

test.describe.configure({ mode: "serial" });

let session: ApiSession;
let context: BrowserContext;
let page: Page;

/**
 * Espera o PATCH debounced do `OnboardingProvider` (500 ms) chegar ao
 * servidor antes de uma navegação completa (`page.goto`/`page.reload`).
 *
 * Um `goto`/`reload` refaz o `/auth/me` do zero — se ele ganhar da escrita
 * pendente, o `welcomeSeenAt` volta a `null` no servidor e o modal de
 * boas-vindas ressuscita no cenário seguinte, ainda que a UI já o tivesse
 * fechado.
 */
async function aguardarWelcomeSeenPersistido() {
  await expect
    .poll(
      async () => {
        const estado = await onboardingState(session);
        return estado.welcomeSeenAt !== null;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
}

test.beforeAll(async ({ browser }) => {
  session = await loginApi();
  // Zera pelo próprio produto (Passo 1 do brief): o seed não garante
  // `onboarding_state` nulo numa execução repetida da suíte.
  await resetOnboarding(session);

  const sessao = await abrirSessao(browser);
  context = sessao.context;
  page = sessao.page;
});

test.afterAll(async () => {
  await context?.close();
  await session?.ctx.dispose();
});

test.describe("Onboarding", () => {
  test("usuário novo vê o modal, dispensa e ele não volta", async () => {
    const modal = page.getByText("Bem-vindo à INEXCI");
    await expect(modal).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Pular por agora" }).click();
    await expect(modal).toHaveCount(0);

    await aguardarWelcomeSeenPersistido();

    await page.reload();
    await expect(page.getByText("Bem-vindo à INEXCI")).toHaveCount(0);
  });

  test("refazer pela aba de Configurações traz o onboarding de volta", async () => {
    await page.goto("/configuracoes?tab=onboarding");
    await expect(
      page.getByRole("heading", { name: "Primeiros passos" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Refazer o onboarding" }).click();

    const modal = page.getByText("Bem-vindo à INEXCI");
    await expect(modal).toBeVisible({ timeout: 15_000 });

    // Fecha para não vazar para o cenário seguinte, e espera persistir antes
    // da próxima navegação completa.
    await page.getByRole("button", { name: "Pular por agora" }).click();
    await expect(modal).toHaveCount(0);
    await aguardarWelcomeSeenPersistido();
  });

  test("a trilha de solicitações vai do começo ao fim", async () => {
    await page.goto("/configuracoes?tab=onboarding");

    const item = page.locator("li", {
      hasText: "Criar e enviar uma solicitação",
    });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Ver" }).click();

    // Passo 1 — "Comece por aqui" (route /solicitacoes-cirurgicas, alvo
    // `sc-nova`, `required: true`).
    await page.waitForURL(/\/solicitacoes-cirurgicas/, { timeout: 15_000 });
    await expect(
      page.getByRole("dialog", { name: "Comece por aqui" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 2 — "Cadastre sem sair daqui": o tour agora ABRE o wizard de
    // verdade e mostra o painel de procedimento, onde vive o botão "Novo"
    // (prova de que o Driver funciona — antes desta mudança, este passo era
    // um card centralizado e o wizard nunca abria sozinho).
    await expect(
      page.getByRole("dialog", { name: "Cadastre sem sair daqui" }),
    ).toBeVisible();
    // `getByText` resolveria para 3 elementos com o wizard aberto (o botão que
    // o abre, o <h2> do painel e o botão de submit) e o modo estrito abortaria.
    await expect(
      page.getByRole("heading", { name: "Nova solicitação" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Novo" }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 3 — "Complete antes de enviar" (sem alvo; o corpo busca as
    // pendências reais no backend, mas o título já resolve na hora).
    await expect(
      page.getByRole("dialog", { name: "Complete antes de enviar" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 4 — "Ou comece por um documento" (alvo `sc-por-documento`),
    // último passo: o botão vira "Concluir".
    await expect(
      page.getByRole("dialog", { name: "Ou comece por um documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Concluir" }).click();

    // O overlay fecha...
    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);

    // ...e a trilha é marcada como concluída no servidor (espera antes do
    // `goto`, que é navegação completa e refaz o `/auth/me`).
    await expect
      .poll(
        async () => {
          const estado = await onboardingState(session);
          return Boolean(estado.completedSteps?.["criar-solicitacao"]);
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    await page.goto("/configuracoes?tab=onboarding");
    const itemConcluido = page.locator("li", {
      hasText: "Criar e enviar uma solicitação",
    });
    await expect(
      itemConcluido.getByRole("button", { name: "Refazer" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("a trilha de agenda abre o modal de nova consulta e o de detalhe sozinha", async () => {
    await page.goto("/configuracoes?tab=onboarding");

    const item = page.locator("li", { hasText: "Marcar uma consulta" });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Ver" }).click();

    // Passo 1 — "Comece por aqui" (route /agenda, alvo agenda-nova-consulta).
    await page.waitForURL(/\/agenda/, { timeout: 15_000 });
    await expect(
      page.getByRole("dialog", { name: "Comece por aqui" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 2 — "Data, hora e duração": o driver abre o modal de nova
    // consulta sozinho, sem o usuário clicar em nada.
    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("dialog", { name: "Data, hora e duração" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 3 — "Confirmar, remarcar ou cancelar": o driver fecha o modal
    // de nova consulta e abre o modal de detalhe com uma consulta
    // FABRICADA — o usuário nunca precisa ter uma consulta real na agenda
    // para ver este passo. `AppointmentDetailModal` usa `title="Consulta"`
    // no `<Modal>`, então o diálogo tem esse nome acessível.
    await expect(
      page.getByRole("dialog", { name: "Consulta", exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-tour="agenda-consulta-acoes"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Confirmar, remarcar ou cancelar" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 4 — "O lembrete vai sozinho" (sem alvo, card centralizado).
    await expect(
      page.getByRole("dialog", { name: "O lembrete vai sozinho" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Concluir" }).click();

    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);
  });
});
