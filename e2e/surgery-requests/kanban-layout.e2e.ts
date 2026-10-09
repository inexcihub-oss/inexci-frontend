import { test, expect, Browser, BrowserContext, Page } from "@playwright/test";
import { abrirSessao } from "../helpers/ui";

const VIEWPORT_MOBILE = { width: 375, height: 667 };
const VIEWPORT_DESKTOP = { width: 1440, height: 900 };

const ALTURA_MINIMA_COLUNA = 400;

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

function bannerDoTopo(pagina: Page) {
  return pagina.locator('main [role="status"]').first();
}

function coluna(pagina: Page, titulo: string) {
  return pagina.locator(`h2:text-is("${titulo}")`).locator("xpath=../..");
}

async function abrirKanban(pagina: Page) {
  await pagina.goto("/solicitacoes-cirurgicas");
  await expect(pagina.locator('h2:text-is("Pendente")')).toBeVisible({
    timeout: 20_000,
  });
}

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

    const rola = await page
      .locator('h2:text-is("Enviada")')
      .locator("xpath=../../*[last()]")
      .evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(rola).toBe(true);
  });
});
