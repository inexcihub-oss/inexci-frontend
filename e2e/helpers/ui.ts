import { Browser, BrowserContext, Page, expect } from "@playwright/test";
import { DOCTOR } from "./credentials";

/**
 * Login pela tela, com espera pela janela do throttler.
 *
 * `/auth/login` aceita 10 tentativas por minuto; a suíte, o setup de massa e o
 * ambiente compartilham essa cota, então um 429 esporádico é ruído de
 * ambiente — não defeito. A espera resolve; falhar direto só esconderia o
 * resultado real do teste.
 */
export async function loginUi(page: Page) {
  await page.goto("/login");

  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    await page.locator("#email").fill(DOCTOR.email);
    await page.locator("#password").fill(DOCTOR.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      // `resolveHome` manda quem tem `atendimento` para o atendimento.
      await page.waitForURL(/\/(dashboard|agenda|atendimento)/, {
        timeout: 15_000,
      });
      return;
    } catch (erro) {
      const texto = await page.locator("body").innerText();
      if (!/Too Many Requests|ThrottlerException/i.test(texto) || tentativa === 6) {
        throw erro;
      }
      await page.waitForTimeout(20_000);
    }
  }
}

/**
 * Abre uma sessão única para o arquivo de teste.
 *
 * Um contexto por teste não serve aqui: o access token vive em memória e a
 * sessão se sustenta no cookie httpOnly de refresh, que é rotacionado a cada
 * uso e tem detecção de reuso. Replicar o mesmo `storageState` em vários
 * contextos dispara a revogação da família de tokens e derruba os testes
 * seguintes na tela de login.
 */
export async function abrirSessao(
  browser: Browser,
  opcoes: Parameters<Browser["newContext"]>[0] = {},
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    ...opcoes,
  });
  const page = await context.newPage();
  await loginUi(page);
  return { context, page };
}

/** Botão "Nova consulta" da agenda — o rótulo é `hidden sm:inline`. */
export function botaoNovaConsulta(page: Page) {
  return page.locator('button:has(span:text-is("Nova consulta"))');
}

/**
 * Seleciona o paciente no `SelectSearch` do modal.
 *
 * A lista é renderizada num portal com `z-index: 9999` no fim do `body`;
 * procurar o nome no documento inteiro acertaria também o card da consulta que
 * está atrás do modal.
 */
export async function selecionarPaciente(page: Page, nome: string) {
  await page.getByText("Buscar paciente pelo nome...").first().click();
  await page.getByPlaceholder("Buscar paciente pelo nome...").fill(
    nome.slice(0, 20),
  );
  const dropdown = page.locator('div[style*="9999"]');
  const opcao = dropdown.getByText(nome, { exact: false }).first();
  await expect(opcao).toBeVisible({ timeout: 15_000 });
  await opcao.click();
}

/** Preenche data (DD/MM/AAAA) e horário do modal de consulta. */
export async function preencherDataHora(
  page: Page,
  dataIso: string,
  horario: string,
) {
  await page
    .getByPlaceholder("DD/MM/AAAA")
    .fill(dataIso.split("-").reverse().join("/"));
  await page.locator('input[type="time"]').fill(horario);
}
