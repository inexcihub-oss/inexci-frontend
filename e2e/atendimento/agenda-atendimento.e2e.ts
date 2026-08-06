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
import {
  abrirSessao,
  botaoNovaConsulta,
  preencherDataHora,
  selecionarPaciente,
} from "../helpers/ui";

/**
 * AU-09 — fluxo "agendar → atender → finalizar" pela interface.
 *
 * É o caminho principal do módulo e o único que atravessa agenda, prontuário e
 * finalização numa tacada só. Roda contra o ambiente local com o seed aplicado
 * (usuário `medico@inexci.com`).
 */

test.describe.configure({ mode: "serial" });

let session: ApiSession;
let context: BrowserContext;
let page: Page;
let patientId: string;
let patientName: string;

/** Data de hoje em `YYYY-MM-DD`, no fuso do navegador (America/Sao_Paulo). */
function hojeIso(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Horário livre para a execução corrente.
 *
 * A limpeza do `afterAll` devolve os slots à agenda, mas uma execução
 * interrompida no meio deixa resíduo — daí a janela girar a cada minuto, em
 * passos de 40 min (maior que a duração padrão de 30, para que duas rodadas
 * seguidas não se sobreponham).
 */
const BASE_MINUTOS = 6 * 60 + (Math.floor(Date.now() / 60_000) % 20) * 40;

function horarioLivre(indice: number): string {
  const minutos = BASE_MINUTOS + indice * 40;
  const hh = String(Math.floor(minutos / 60) % 24).padStart(2, "0");
  const mm = String(minutos % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

test.beforeAll(async ({ browser }) => {
  session = await loginApi();
  patientName = `E2E Playwright ${Date.now()}`;
  const paciente = await criarPaciente(session, patientName, gerarCpf());
  patientId = paciente.id;

  const sessao = await abrirSessao(browser);
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

test.describe("Agenda → Atendimento", () => {
  test("agenda a consulta pela tela, atende e finaliza a ficha", async () => {
    const horario = horarioLivre(1);

    await page.goto("/agenda");
    await expect(page.getByRole("button", { name: "Hoje" })).toBeVisible();

    // ── Agendar ────────────────────────────────────────────────────────────
    await botaoNovaConsulta(page).click();
    await expect(
      page.getByRole("dialog", { name: "Nova consulta" }),
    ).toBeVisible();

    await selecionarPaciente(page, patientName);
    await preencherDataHora(page, hojeIso(), horario);
    await page.getByRole("button", { name: "Agendar consulta" }).click();

    // O card aparece na grade da semana corrente.
    const card = page.getByTitle(new RegExp(patientName)).first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    // ── Abrir o atendimento ────────────────────────────────────────────────
    await card.click();
    const detalhe = page.getByRole("dialog", { name: "Consulta" });
    await expect(detalhe).toBeVisible();
    await detalhe.getByRole("button", { name: "Iniciar atendimento" }).click();

    await page.waitForURL(/\/atendimento\/[0-9a-f-]{36}/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: patientName })).toBeVisible();

    // ── Preencher a ficha ──────────────────────────────────────────────────
    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill("Dor lombar há duas semanas.");

    await page.getByRole("button", { name: "Salvar rascunho" }).first().click();
    await expect(page.getByText("Alterações não salvas")).toHaveCount(0, {
      timeout: 15_000,
    });

    // ── Finalizar ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Finalizar", exact: true }).click();
    await expect(page.getByText("Finalizado", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // Ficha finalizada é imutável: os botões de escrita somem.
    await expect(
      page.getByRole("button", { name: "Salvar rascunho" }),
    ).toHaveCount(0);

    // E a consulta sai da agenda como realizada.
    const consultas = await session.ctx.get(
      `/appointments/patient/${patientId}`,
      { headers: { Authorization: `Bearer ${session.token}` } },
    );
    const corpo = await consultas.json();
    expect(corpo.records[0].status).toBe("completed");
  });

  test("bloqueia agendar duas consultas do mesmo médico no mesmo horário", async () => {
    const horario = horarioLivre(3);
    const [hh, mm] = horario.split(":");
    await agendarViaApi(
      session,
      patientId,
      new Date(`${hojeIso()}T${hh}:${mm}:00`).toISOString(),
    );

    await page.goto("/agenda");
    await botaoNovaConsulta(page).click();
    await selecionarPaciente(page, patientName);
    await preencherDataHora(page, hojeIso(), horario);
    await page.getByRole("button", { name: "Agendar consulta" }).click();

    await expect(
      page.getByText(/Já existe uma consulta para este médico neste horário/),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("o hub de atendimento lista a consulta do paciente", async () => {
    await page.goto("/atendimento");
    await expect(page.getByText(patientName).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
