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

  test("refazer pela aba de Configurações reinicia direto no primeiro tour", async () => {
    await page.goto("/configuracoes?tab=onboarding");
    await expect(
      page.getByRole("heading", { name: "Primeiros passos" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Refazer o onboarding" }).click();

    // "Refazer" não deve devolver o usuário ao banner/modal de boas-vindas:
    // ele abre a primeira trilha imediatamente, no caminho real do tour.
    await expect(page.getByText("Bem-vindo à INEXCI")).toHaveCount(0);
    // Para o médico do seed, a primeira trilha visível é a de documentos,
    // cujo primeiro passo leva ao Perfil. O ponto é iniciar o tour sem CTA
    // intermediário, não impor uma trilha que talvez nem seja visível.
    await expect(
      page.getByRole("dialog", { name: "Envie sua assinatura" }),
    ).toBeVisible({ timeout: 15_000 });

    // Sai sem concluir para não vazar estado do tour para o cenário seguinte,
    // mas aguarda a marcação de boas-vindas iniciada pelo próprio "Refazer".
    await page.getByRole("button", { name: "Sair do tour" }).click();
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

    // Passo 2 — "Nove status, um caminho só" (alvo `sc-kanban-colunas`).
    await expect(
      page.getByRole("dialog", { name: "Nove status, um caminho só" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 3 — "Filtre o quadro" (alvo `sc-filtro`).
    await expect(
      page.getByRole("dialog", { name: "Filtre o quadro" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 4 — "Cadastre sem sair daqui": o tour agora ABRE o wizard de
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

    // Passo 5 — "Complete antes de enviar" (sem alvo; o corpo busca as
    // pendências reais no backend, mas o título já resolve na hora).
    await expect(
      page.getByRole("dialog", { name: "Complete antes de enviar" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 6 — "Ou comece por um documento" (alvo `sc-por-documento`).
    await expect(
      page.getByRole("dialog", { name: "Ou comece por um documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 7 — "Envie e acompanhe a análise": o driver abre o modal e
    // mantém a análise demonstrativa nele. A revisão não pode abrir sozinha.
    await expect(
      page.getByRole("dialog", { name: "Envie e acompanhe a análise" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/solicitacoes-cirurgicas$/);
    await page
      .getByRole("dialog", { name: "Envie e acompanhe a análise" })
      .getByRole("button", { name: "Próximo" })
      .click();
    await page.waitForURL(/\/nova-via-documento/, { timeout: 15_000 });

    // Passo 8 (último) — "Revise antes de criar". O botão vira "Concluir".
    await expect(
      page.getByRole("dialog", { name: "Revise antes de criar" }),
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
    // O botão "Próximo" é resolvido dentro do diálogo do próprio tour: a
    // Agenda tem seu próprio botão de navegação de data com o mesmo rótulo
    // acessível ("Próximo" do `<DatePickerPopover>`), e um seletor solto por
    // toda a página colide em modo estrito.
    await page.waitForURL(/\/agenda/, { timeout: 15_000 });
    const passo1 = page.getByRole("dialog", { name: "Comece por aqui" });
    await expect(passo1).toBeVisible({ timeout: 15_000 });
    await passo1.getByRole("button", { name: "Próximo" }).click();

    // Passo 2 — "Data, hora e duração": o driver abre o modal de nova
    // consulta sozinho, sem o usuário clicar em nada.
    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toBeVisible({ timeout: 15_000 });
    const passo2 = page.getByRole("dialog", { name: "Data, hora e duração" });
    await expect(passo2).toBeVisible();
    await passo2.getByRole("button", { name: "Próximo" }).click();

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
    const passo3 = page.getByRole("dialog", {
      name: "Confirmar, remarcar ou cancelar",
    });
    await expect(passo3).toBeVisible();
    await passo3.getByRole("button", { name: "Próximo" }).click();

    // Passo 4 — "O lembrete vai sozinho" (sem alvo, card centralizado).
    const passo4 = page.getByRole("dialog", {
      name: "O lembrete vai sozinho",
    });
    await expect(passo4).toBeVisible({ timeout: 15_000 });
    await passo4.getByRole("button", { name: "Concluir" }).click();

    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);
  });

  test("a trilha de solicitações simula a análise via documento sem chamar o backend de extração", async () => {
    // Prova DIRETA (não só indireta via nome fabricado/botão desabilitado):
    // nenhuma requisição de rede desta trilha pode bater no endpoint real de
    // extração — a simulação precisa nunca sair do cliente.
    const chamadasDeExtracao: string[] = [];
    const escutaDeRequisicoes = (req: import("@playwright/test").Request) => {
      if (req.url().includes("/surgery-requests/extract-from-document")) {
        chamadasDeExtracao.push(`${req.method()} ${req.url()}`);
      }
    };
    page.on("request", escutaDeRequisicoes);

    await page.goto("/configuracoes?tab=onboarding");

    const item = page.locator("li", {
      hasText: "Criar e enviar uma solicitação",
    });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Refazer" }).click();

    // Passos 1-3 (abrir-wizard, kanban-status, filtro) — sem interação
    // além de avançar.
    await page.waitForURL(/\/solicitacoes-cirurgicas/, { timeout: 15_000 });
    await expect(
      page.getByRole("dialog", { name: "Comece por aqui" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Nove status, um caminho só" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Filtre o quadro" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 4 — "Cadastre sem sair daqui" (já coberto no cenário anterior).
    await expect(
      page.getByRole("dialog", { name: "Cadastre sem sair daqui" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 5 — "Complete antes de enviar".
    await expect(
      page.getByRole("dialog", { name: "Complete antes de enviar" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 6 — "Ou comece por um documento".
    await expect(
      page.getByRole("dialog", { name: "Ou comece por um documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    // Passo 7 — "Envie e acompanhe a análise": o driver abre o modal de
    // upload sozinho e a simulação entra em "Análise em andamento" sem
    // nenhum arquivo selecionado pelo usuário.
    await expect(
      page.getByRole("heading", { name: "Criar solicitação a partir de documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Análise em andamento")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("dialog", { name: "Envie e acompanhe a análise" }),
    ).toBeVisible();
    // A simulação permanece nesta tela até a confirmação explícita.
    await expect(page).toHaveURL(/\/solicitacoes-cirurgicas$/);
    await page
      .getByRole("dialog", { name: "Envie e acompanhe a análise" })
      .getByRole("button", { name: "Próximo" })
      .click();
    await page.waitForURL(/\/nova-via-documento/, { timeout: 15_000 });

    // Passo 8 (último) — "Revise antes de criar".
    await expect(
      page.getByRole("dialog", { name: "Revise antes de criar" }),
    ).toBeVisible({ timeout: 15_000 });

    // O paciente fabricado aparece pré-preenchido — prova de que o
    // localStorage recebeu o resultado da simulação, não uma extração real.
    // `getByDisplayValue` é API do Testing Library, não do Playwright — o
    // campo "Nome completo" não tem `id` (logo, sem associação `label`
    // programática para `getByLabel`), então a checagem usa a mesma âncora
    // `data-tour` que a suíte de unidade já usa para provar que o card
    // renderizou (`nova-via-documento/page.spec.tsx`).
    await expect(
      page
        .locator('[data-tour="sc-documento-paciente-extraido"] input')
        .first(),
    ).toHaveValue("Paciente de demonstração");

    // O botão de criar fica desabilitado — guard de proveniência
    // (`tempStoragePath === "tour-demo"`), mesmo com o tour ainda ativo.
    await expect(
      page.getByRole("button", { name: "Criar solicitação" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Concluir" }).click();
    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);

    // O botão continua desabilitado depois do tour terminar — proveniência,
    // não `emTour`.
    await expect(
      page.getByRole("button", { name: "Criar solicitação" }),
    ).toBeDisabled();

    page.off("request", escutaDeRequisicoes);
    expect(chamadasDeExtracao).toEqual([]);
  });

  test("a trilha de cadastros abre o menu Mais no mobile", async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/configuracoes?tab=onboarding");

    // Este cenário também precisa funcionar sozinho, quando o reset do
    // beforeAll deixou o welcome aberto (na execução serial completa ele já
    // foi dispensado pelo primeiro caso).
    const welcome = page.getByText("Bem-vindo à INEXCI");
    if (await welcome.isVisible()) {
      await page.getByRole("button", { name: "Pular por agora" }).click();
    }

    const item = page.locator("li", { hasText: "Preencher os cadastros" });
    await expect(item).toBeVisible();
    await item.getByRole("button", { name: "Ver" }).click();

    await page.waitForURL(/\/pacientes/, { timeout: 15_000 });
    const pacientes = page.getByRole("dialog", {
      name: "O paciente é o cadastro central",
    });
    await expect(pacientes).toBeVisible({ timeout: 15_000 });
    await pacientes.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", {
        name: "Hospitais, convênios e fornecedores",
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('div[data-tour="cadastros-menu-mobile"]'),
    ).toBeVisible();
    await expect(page.getByText("Hospitais", { exact: true })).toBeVisible();
    await expect(page.getByText("Convênios", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Fornecedores", { exact: true }),
    ).toBeVisible();
  });
});
