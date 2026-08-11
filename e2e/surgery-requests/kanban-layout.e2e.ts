import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import { abrirSessao } from "../helpers/ui";

/**
 * Layout do kanban de solicitações sob o banner de topo, nos dois tamanhos.
 *
 * O defeito de origem: o dashboard tinha altura travada (`h-screen
 * overflow-hidden` → `main overflow-hidden` → `PageContainer h-full`), então
 * tudo que ocupasse o topo — banner de cota, cabeçalho da página, toolbar —
 * era descontado direto da altura das colunas, que são `h-full`. Em 375×667
 * com o banner de cota saturada sobravam 32 px de coluna, e não havia como
 * rolar para revelar o resto.
 *
 * O desktop tem a mesma origem e um desfecho diferente: lá não há rolagem de
 * página, então altura a mais não aperta a coluna — ela **transborda** o
 * `main` e o excedente é cortado sem aviso. Por isso as duas medições vivem
 * juntas aqui: é uma causa só, com dois sintomas que não se substituem. Cobrir
 * só o mobile foi exatamente o furo que deixou o desktop quebrado.
 *
 * A verificação é por **geometria**, não por classe CSS: a classe é a
 * implementação, e é justamente ela que vai mudar da próxima vez.
 */

const VIEWPORT_MOBILE = { width: 375, height: 667 };
const VIEWPORT_DESKTOP = { width: 1440, height: 900 };

/**
 * Piso de área útil do kanban no mobile. Uma coluna precisa caber no cabeçalho
 * (~52 px) mais dois `ProcedureCard` inteiros; abaixo disso a tela volta a ser
 * a do defeito. 400 px é folgado o bastante para não quebrar com um ajuste de
 * espaçamento e apertado o bastante para pegar a regressão real (32 px).
 */
const ALTURA_MINIMA_COLUNA = 400;

/**
 * Abre a sessão e finge a cota estourada, para o banner crítico aparecer.
 *
 * Interceptação em vez de enviar 10 solicitações de verdade: o que está sob
 * teste é o layout sob um banner alto, não a regra de cota — que já tem
 * cobertura no backend. Enviar solicitações reais ainda sujaria o banco
 * compartilhado pela suíte.
 */
async function abrirComCotaEstourada(
  browser: Browser,
  viewport: { width: number; height: number },
): Promise<{ context: BrowserContext; page: Page }> {
  const sessao = await abrirSessao(browser, { viewport });
  await sessao.page.route("**/billing/quota", async (route) => {
    const fimDoCiclo = new Date();
    fimDoCiclo.setMonth(fimDoCiclo.getMonth() + 1);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        used: 10,
        limit: 10,
        isUnlimited: false,
        remaining: 0,
        periodStart: new Date().toISOString(),
        periodEnd: fimDoCiclo.toISOString(),
      }),
    });
  });
  return sessao;
}

/** Banner de topo do dashboard (cota ou assinatura), renderizado por `GlobalBanners`. */
function bannerDoTopo(pagina: Page) {
  return pagina.locator('main [role="status"]').first();
}

/** Coluna do kanban que contém o cabeçalho informado. */
function coluna(pagina: Page, titulo: string) {
  return pagina.locator(`h2:text-is("${titulo}")`).locator("xpath=../..");
}

async function abrirKanban(pagina: Page) {
  await pagina.goto("/solicitacoes-cirurgicas");
  // O cabeçalho da primeira coluna é o sinal de que o board montou; o título
  // da página é `sr-only` no mobile e não serve de âncora visual.
  await expect(pagina.locator('h2:text-is("Pendente")')).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * O banner precisa ser alto de verdade para o teste exercitar o que se propõe:
 * um `[role="status"]` de 20 px (um spinner, por exemplo) passaria sem ter
 * reproduzido a disputa por espaço vertical.
 */
async function garantirBannerAlto(pagina: Page) {
  const banner = bannerDoTopo(pagina);
  await expect(banner).toBeVisible();
  const caixa = await banner.boundingBox();
  expect(caixa!.height).toBeGreaterThan(80);
}

test.describe("Kanban de solicitações — mobile (375 px)", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await abrirComCotaEstourada(browser, VIEWPORT_MOBILE));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("o banner de topo aparece sem espremer a coluna do kanban", async () => {
    await abrirKanban(page);
    await garantirBannerAlto(page);

    const caixa = await coluna(page, "Pendente").boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.height).toBeGreaterThanOrEqual(ALTURA_MINIMA_COLUNA);
  });

  test("a página rola para tirar o banner da tela", async () => {
    await abrirKanban(page);

    const banner = bannerDoTopo(page);
    const antes = await banner.boundingBox();
    expect(antes).not.toBeNull();

    await page.mouse.wheel(0, 400);
    // A rolagem é do `main`, não do documento — esperar por `scrollY` não
    // funcionaria. O deslocamento do próprio banner é o sinal observável.
    await expect(async () => {
      const depois = await banner.boundingBox();
      expect(depois!.y).toBeLessThan(antes!.y - 100);
    }).toPass({ timeout: 5_000 });
  });

  test("a coluna inteira fica alcançável ao rolar a página", async () => {
    await abrirKanban(page);

    const base = coluna(page, "Pendente");
    await base.scrollIntoViewIfNeeded();
    const caixa = await base.boundingBox();
    const altura = page.viewportSize()!.height;
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(altura + 1);
  });

  test("as colunas seguintes são alcançáveis pela rolagem horizontal", async () => {
    await abrirKanban(page);

    const ultima = page.locator('h2:text-is("Encerrada")');
    await ultima.scrollIntoViewIfNeeded();
    await expect(ultima).toBeInViewport({ timeout: 5_000 });
  });

  test("a página não estoura a largura da viewport", async () => {
    await abrirKanban(page);

    const estouro = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    // 1 px de folga para arredondamento de layout.
    expect(estouro).toBeLessThanOrEqual(1);
  });
});

test.describe("Kanban de solicitações — desktop (1440 px)", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    ({ context, page } = await abrirComCotaEstourada(
      browser,
      VIEWPORT_DESKTOP,
    ));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("o banner não empurra conteúdo para fora do `main`", async () => {
    await abrirKanban(page);
    await garantirBannerAlto(page);

    // No desktop o `main` não rola: o que passar da altura dele some sem aviso.
    // Antes da correção sobravam 136 px cortados, e o rodapé da coluna ficava
    // inalcançável.
    const excedente = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      return main.scrollHeight - main.clientHeight;
    });
    expect(excedente).toBeLessThanOrEqual(1);
  });

  test("a coluna termina dentro da viewport", async () => {
    await abrirKanban(page);

    const caixa = await coluna(page, "Enviada").boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
  });

  test("os cards rolam por dentro da coluna, sem rolar a página", async () => {
    await abrirKanban(page);

    // O corpo da coluna é o último filho: é ele que tem `overflow-y-auto`.
    const rola = await page
      .locator('h2:text-is("Enviada")')
      .locator("xpath=../../*[last()]")
      .evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(rola).toBe(true);
  });
});
