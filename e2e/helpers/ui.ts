import { Browser, BrowserContext, Page, expect } from "@playwright/test";
import { DOCTOR } from "./credentials";

export async function loginUi(page: Page) {
  await page.goto("/login");

  for (let tentativa = 1; tentativa <= 6; tentativa++) {
    await page.locator("#email").fill(DOCTOR.email);
    await page.locator("#password").fill(DOCTOR.password);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
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

export function botaoNovaConsulta(page: Page) {
  return page.locator('button:has(span:text-is("Nova consulta"))');
}

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
