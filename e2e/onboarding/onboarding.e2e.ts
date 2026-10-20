import { test, expect, BrowserContext, Page } from "@playwright/test";
import {
  ApiSession,
  loginApi,
  onboardingState,
  resetOnboarding,
} from "../helpers/api";
import { abrirSessao } from "../helpers/ui";

test.describe.configure({ mode: "serial" });

let session: ApiSession;
let context: BrowserContext;
let page: Page;

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

    await expect(page.getByText("Bem-vindo à INEXCI")).toHaveCount(0);
    await expect(
      page.getByRole("dialog", { name: "Envie sua assinatura" }),
    ).toBeVisible({ timeout: 15_000 });

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

    await expect(
      page.getByRole("dialog", { name: "Cadastre sem sair daqui" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nova solicitação" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("button", { name: "Novo" }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Complete antes de enviar" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Ou comece por um documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Envie e acompanhe a análise" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/solicitacoes-cirurgicas$/);
    await page
      .getByRole("dialog", { name: "Envie e acompanhe a análise" })
      .getByRole("button", { name: "Próximo" })
      .click();
    await page.waitForURL(/\/nova-via-documento/, { timeout: 15_000 });

    await expect(
      page.getByRole("dialog", { name: "Revise antes de criar" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Concluir" }).click();

    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);

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

    await page.waitForURL(/\/agenda/, { timeout: 15_000 });
    const passo1 = page.getByRole("dialog", { name: "Comece por aqui" });
    await expect(passo1).toBeVisible({ timeout: 15_000 });
    await passo1.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toBeVisible({ timeout: 15_000 });
    const passo2 = page.getByRole("dialog", { name: "Data, hora e duração" });
    await expect(passo2).toBeVisible();
    await passo2.getByRole("button", { name: "Próximo" }).click();

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

    await expect(
      page.getByRole("dialog", { name: "Cadastre sem sair daqui" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Complete antes de enviar" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("dialog", { name: "Ou comece por um documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Próximo" }).click();

    await expect(
      page.getByRole("heading", { name: "Criar solicitação a partir de documento" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Análise em andamento")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("dialog", { name: "Envie e acompanhe a análise" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/solicitacoes-cirurgicas$/);
    await page
      .getByRole("dialog", { name: "Envie e acompanhe a análise" })
      .getByRole("button", { name: "Próximo" })
      .click();
    await page.waitForURL(/\/nova-via-documento/, { timeout: 15_000 });

    await expect(
      page.getByRole("dialog", { name: "Revise antes de criar" }),
    ).toBeVisible({ timeout: 15_000 });

    await expect(
      page
        .locator('[data-tour="sc-documento-paciente-extraido"] input')
        .first(),
    ).toHaveValue("Paciente de demonstração");

    await expect(
      page.getByRole("button", { name: "Criar solicitação" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: "Concluir" }).click();
    await expect(
      page.getByRole("button", { name: "Sair do tour" }),
    ).toHaveCount(0);

    await expect(
      page.getByRole("button", { name: "Criar solicitação" }),
    ).toBeDisabled();

    page.off("request", escutaDeRequisicoes);
    expect(chamadasDeExtracao).toEqual([]);
  });

  test("a trilha de cadastros abre o menu Mais no mobile", async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/configuracoes?tab=onboarding");

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
