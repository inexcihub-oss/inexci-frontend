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

test.describe.configure({ mode: "serial" });

const VIEWPORT_MOBILE = { width: 375, height: 812 };

let session: ApiSession;
let context: BrowserContext;
let page: Page;
let patientId: string;
let patientName: string;
let appointmentId: string;

async function semScrollHorizontal(pagina: Page) {
  const estouro = await pagina.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(estouro).toBeLessThanOrEqual(1);
}

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

async function abrirProximas() {
  await page.goto("/atendimento");
  const aba = page.getByRole("button", { name: "Próximas" });
  await expect(aba).toBeVisible({ timeout: 15_000 });
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

    await abas.nth(1).click();
    await expect(abas.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(abas.first()).toHaveAttribute("aria-selected", "false");
    await abas.first().click();

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

    expect(razaoDeContraste(cores.texto, cores.fundo)).toBeGreaterThanOrEqual(
      4.5,
    );
  });
});
