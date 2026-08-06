import { test, expect, BrowserContext, Page } from "@playwright/test";
import {
  ApiSession,
  agendarViaApi,
  criarPaciente,
  excluirPaciente,
  gerarCpf,
  limparConsultas,
  loginApi,
} from "../helpers/api";
import { abrirSessao, botaoNovaConsulta } from "../helpers/ui";

/**
 * Bloco 23 do `PLANO-TESTES-ATENDIMENTO-AGENDA.md` — mobile, responsividade e
 * acessibilidade. Era o único bloco em 0/10 por exigir inspeção visual em
 * viewport pequeno; o que dá para verificar por medição (overflow, alvo de
 * toque, papéis ARIA, contraste) está automatizado aqui.
 *
 * Fica de fora, por não ser observável sem dispositivo real: UX-04 (foco do
 * editor ao abrir o teclado virtual).
 */

test.describe.configure({ mode: "serial" });

const VIEWPORT_MOBILE = { width: 375, height: 812 };

let session: ApiSession;
let context: BrowserContext;
let page: Page;
let patientId: string;
let patientName: string;
let appointmentId: string;

/** Não pode haver rolagem horizontal: a página inteira estoura a viewport. */
async function semScrollHorizontal(pagina: Page) {
  const estouro = await pagina.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  // 1 px de folga para arredondamento de layout.
  expect(estouro).toBeLessThanOrEqual(1);
}

/** Contraste WCAG entre duas cores `rgb()` computadas. */
function razaoDeContraste(fg: string, bg: string): number {
  const canal = (cor: string) =>
    (cor.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"])
      .slice(0, 3)
      .map((n) => {
        const c = Number(n) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
  const lum = (cor: string) => {
    const [r, g, b] = canal(cor);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = lum(fg);
  const l2 = lum(bg);
  const [claro, escuro] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (claro + 0.05) / (escuro + 0.05);
}

test.beforeAll(async ({ browser }) => {
  session = await loginApi();
  patientName = `E2E Mobile ${Date.now()}`;
  const paciente = await criarPaciente(session, patientName, gerarCpf());
  patientId = paciente.id;

  // Amanhã, em hora girada pelo minuto de início: a consulta precisa estar no
  // futuro (a aba "Próximas" do hub é o que UX-02 e UX-08 leem), e a rotação
  // evita colidir com o resíduo de uma execução interrompida antes da limpeza.
  const quando = new Date();
  quando.setDate(quando.getDate() + 1);
  quando.setHours(9 + (Math.floor(Date.now() / 60_000) % 6), 15, 0, 0);
  const consulta = await agendarViaApi(session, patientId, quando.toISOString());
  appointmentId = consulta.id;

  const sessao = await abrirSessao(browser, { viewport: VIEWPORT_MOBILE });
  context = sessao.context;
  page = sessao.page;
});

test.afterAll(async () => {
  await context?.close();
  if (session && patientId) {
    await limparConsultas(session, patientId);
    await excluirPaciente(session, patientId);
    await session.ctx.dispose();
  }
});

/**
 * Abre a aba "Próximas" do hub — a consulta do teste é de amanhã, e a aba
 * padrão ("Hoje") não a mostraria.
 */
async function abrirProximas() {
  await page.goto("/atendimento");
  const aba = page.getByRole("button", { name: "Próximas" });
  await expect(aba).toBeVisible({ timeout: 15_000 });
  // Clicar antes da hidratação não troca a aba; a classe do estado ativo é o
  // sinal de que o React assumiu o botão.
  await expect(async () => {
    await aba.click();
    await expect(aba).toHaveClass(/bg-white/, { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

test.describe("Mobile e acessibilidade (375 px)", () => {
  test("UX-01: a agenda cabe na tela e o cabeçalho não quebra", async () => {
    await page.goto("/agenda");
    await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();
    await semScrollHorizontal(page);
  });

  test("UX-09: a barra inferior mostra as áreas do usuário", async () => {
    await page.goto("/agenda");
    const nav = page.locator("nav").last();
    await expect(nav.getByText("Agenda")).toBeVisible();
    await expect(nav.getByText("Atendimento")).toBeVisible();
  });

  test("UX-02: o hub de atendimento é legível em 375 px", async () => {
    await abrirProximas();
    await expect(page.getByText(patientName).first()).toBeVisible({
      timeout: 15_000,
    });
    await semScrollHorizontal(page);
  });

  test("UX-03/UX-07: abas com ARIA correto e ações no rodapé com alvo de 44 px", async () => {
    await page.goto(`/atendimento/${appointmentId}`);

    const tablist = page.getByRole("tablist", {
      name: "Seções do atendimento",
    });
    await expect(tablist).toBeVisible({ timeout: 20_000 });

    const abas = tablist.getByRole("tab");
    await expect(abas.first()).toHaveAttribute("aria-selected", "true");

    // Trocar de aba move o `aria-selected` — é o que o leitor de tela anuncia.
    await abas.nth(1).click();
    await expect(abas.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(abas.first()).toHaveAttribute("aria-selected", "false");
    await abas.first().click();

    // Em mobile os botões de escrita vivem no rodapé da ficha.
    const finalizar = page
      .getByRole("button", { name: "Finalizar atendimento" })
      .first();
    await expect(finalizar).toBeVisible();
    const box = await finalizar.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await semScrollHorizontal(page);
  });

  test("UX-05/UX-06: dropdown do modal não é cortado, Esc fecha", async () => {
    await page.goto("/agenda");
    await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();

    await botaoNovaConsulta(page).first().click();
    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toBeVisible();

    await page.getByText("Buscar paciente pelo nome...").first().click();
    await page.getByPlaceholder("Buscar paciente pelo nome...").fill("E2E");

    const opcao = page.locator('div[style*="9999"]').getByText("E2E").first();
    await expect(opcao).toBeVisible({ timeout: 15_000 });

    // O dropdown vive num portal com `position: fixed` — se estivesse dentro do
    // corpo rolável do modal, ficaria recortado abaixo da dobra.
    const caixa = await opcao.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.y).toBeLessThan(VIEWPORT_MOBILE.height);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("UX-08: o badge de status tem contraste legível", async () => {
    await abrirProximas();
    // O badge é o `span` arredondado do card, não qualquer texto "Agendada" da
    // tela: pegar o primeiro nó com esse texto podia cair num elemento sem cor
    // própria e medir contraste 1:1 de um lugar que ninguém lê.
    const badge = page
      .locator("span.rounded-full")
      .filter({ hasText: "Agendada" })
      .first();
    await expect(badge).toBeVisible({ timeout: 15_000 });

    const cores = await badge.evaluate((el) => {
      const estilo = getComputedStyle(el as HTMLElement);
      let fundo = estilo.backgroundColor;
      let no: HTMLElement | null = el as HTMLElement;
      while (no && (fundo === "rgba(0, 0, 0, 0)" || fundo === "transparent")) {
        no = no.parentElement;
        fundo = no ? getComputedStyle(no).backgroundColor : "rgb(255,255,255)";
      }
      return { texto: estilo.color, fundo };
    });

    // 4.5:1 é o mínimo do WCAG AA para texto pequeno.
    expect(razaoDeContraste(cores.texto, cores.fundo)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
