import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PERMISSION_DESCRIPTIONS } from "@/lib/permissions";
import type { TrackId } from "@/lib/onboarding/state";
import type { Track } from "@/lib/onboarding/tour-registry";
import { trackById, visibleSteps } from "@/lib/onboarding/tour-registry";
import { TourOverlay } from "./TourOverlay";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/solicitacoes-cirurgicas",
}));

const TRILHA: Track = {
  id: "solicitacoes",
  label: "Criar e enviar uma solicitação",
  descricao: "…",
  stepKey: "criar-solicitacao",
  steps: [
    { key: "um", titulo: "Passo um", corpo: "Corpo um", target: "alvo-um" },
    { key: "dois", titulo: "Passo dois", corpo: "Corpo dois", target: "sem-alvo" },
    { key: "tres", titulo: "Passo três", corpo: "Corpo três", target: "alvo-tres" },
  ],
};

/**
 * Fixture separada para o passo obrigatório: misturar um passo `required`
 * com alvo ausente na `TRILHA` acima mudaria o fluxo dos 6 testes originais
 * (o tour encerraria com aviso antes de chegar em "Passo três"). Usa um
 * `trackId` diferente ("documentos-do-medico") para não colidir.
 */
const TRILHA_OBRIGATORIA: Track = {
  id: "documentos-do-medico",
  label: "Configurar sua assinatura",
  descricao: "…",
  stepKey: "assinatura-do-medico",
  steps: [
    {
      key: "unico",
      titulo: "Passo obrigatório",
      corpo: "Corpo obrigatório",
      target: "alvo-que-nao-existe",
      required: true,
    },
  ],
};

/**
 * Fixture com um passo `key: "requisitos"` de verdade — nenhum caso acima
 * exercita esse ramo. Tem DOIS passos (não um só) de propósito: a prova de
 * "busca uma vez só" (achado 2 da revisão da Task 16) precisa navegar para
 * trás e para frente dentro da MESMA montagem, e isso exige um passo anterior
 * para onde voltar.
 */
const TRILHA_REQUISITOS: Track = {
  id: "solicitacoes-requisitos",
  label: "Criar e enviar uma solicitação",
  descricao: "…",
  stepKey: "criar-solicitacao",
  steps: [
    { key: "antes", titulo: "Passo antes", corpo: "Corpo antes", target: "alvo-antes" },
    {
      key: "requisitos",
      titulo: "Complete antes de enviar",
      // `corpo` estático não deve aparecer: o TourOverlay troca por
      // `comRequisitos(...)` só para este `key`.
      corpo: "CORPO ESTÁTICO — não deveria renderizar",
      target: "alvo-requisitos",
    },
  ],
};

/**
 * Fixture com `route` num passo — `pushMock` é declarado desde o início do
 * arquivo, mas nenhum caso o exercitava (achado da revisão final: "não há
 * prova de que `router.push` é chamado com a rota do passo").
 */
const TRILHA_COM_ROTA: Track = {
  id: "com-rota",
  label: "Trilha com rota",
  descricao: "…",
  stepKey: "assinatura-do-medico",
  steps: [
    {
      key: "com-rota",
      titulo: "Passo com rota",
      corpo: "Corpo com rota",
      target: "alvo-com-rota",
      route: "/configuracoes?tab=profile",
    },
  ],
};

/**
 * Fixture do passo `aguardaAcao`: alvo que nunca aparece na montagem (o
 * usuário ainda não abriu o modal), mas o balão precisa aparecer mesmo assim
 * — é o contraponto de `TRILHA_PASSO_COMUM`, que continua muda em "buscando".
 */
const TRILHA_AGUARDA_ACAO: Track = {
  id: "aguarda-acao",
  label: "Trilha com passo aguardaAcao",
  descricao: "…",
  stepKey: "marcar-consulta",
  steps: [
    {
      key: "espera",
      titulo: "Clique em Nova consulta",
      corpo: "O formulário abre ao lado.",
      target: "alvo-que-nao-existe-ainda",
      aguardaAcao: true,
    },
  ],
};

const TRILHA_PASSO_COMUM: Track = {
  id: "passo-comum-sem-alvo",
  label: "Trilha com passo comum sem aguardaAcao",
  descricao: "…",
  stepKey: "marcar-consulta",
  steps: [
    {
      key: "comum",
      titulo: "Passo comum",
      corpo: "…",
      target: "alvo-que-nao-existe-ainda",
    },
  ],
};

vi.mock("@/lib/onboarding/tour-registry", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/onboarding/tour-registry")
  >();
  return {
    ...original,
    trackById: (id: string) => {
      if (id === "documentos-do-medico") return TRILHA_OBRIGATORIA;
      if (id === "solicitacoes-requisitos") return TRILHA_REQUISITOS;
      if (id === "com-rota") return TRILHA_COM_ROTA;
      if (id === "aguarda-acao") return TRILHA_AGUARDA_ACAO;
      if (id === "passo-comum-sem-alvo") return TRILHA_PASSO_COMUM;
      // "administracao" usa a trilha REAL do registry (não uma fixture) —
      // é o único jeito de provar que o passo "areas" de produção deriva o
      // corpo de `PERMISSION_DESCRIPTIONS`, e não de um texto copiado aqui.
      if (id === "administracao") return original.trackById(id);
      return TRILHA;
    },
    visibleSteps: (t: Track) => t.steps,
  };
});

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: () => ({
    viewer: { permissions: [], isDoctor: false, isAccountOwner: false },
  }),
}));

const { fetchRequisitosPendenteMock } = vi.hoisted(() => ({
  fetchRequisitosPendenteMock: vi.fn(),
}));

vi.mock("@/services/onboarding-requirements", () => ({
  fetchRequisitosPendente: fetchRequisitosPendenteMock,
}));

function montarAlvos(nomes: string[]) {
  for (const nome of nomes) {
    const el = document.createElement("button");
    el.setAttribute("data-tour", nome);
    el.textContent = nome;
    document.body.appendChild(el);
  }
}

/**
 * Monta o `TourOverlay` da trilha REAL `trackId` (via `trackById`/
 * `visibleSteps` mockados acima, que encaminham "administracao" para o
 * registry de produção) e avança até o passo `key`, clicando em "Próximo"
 * pelos passos anteriores. Monta antecipadamente o alvo de qualquer passo
 * anterior que declare `target`, para nenhum deles ser pulado ou interromper
 * o tour por alvo ausente.
 */
async function renderOverlayNoPasso(trackId: TrackId, key: string) {
  const track = trackById(trackId)!;
  const passos = visibleSteps(track, {
    permissions: [],
    isDoctor: false,
    isAccountOwner: false,
  });
  const indiceAlvo = passos.findIndex((p) => p.key === key);
  const anteriores = passos.slice(0, indiceAlvo);
  montarAlvos(
    anteriores.filter((p) => p.target).map((p) => p.target as string),
  );

  const user = userEvent.setup();
  render(<TourOverlay trackId={trackId} onClose={vi.fn()} />);

  for (const passo of anteriores) {
    await screen.findByText(passo.titulo, {}, { timeout: 4000 });
    await user.click(screen.getByRole("button", { name: /próximo/i }));
  }
}

describe("TourOverlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    fetchRequisitosPendenteMock.mockReset().mockResolvedValue([]);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    // jsdom não implementa scrollIntoView (usado por useTargetRect ao achar o
    // alvo). Acomodação de ambiente de teste, não do código de produção — ver
    // o mesmo comentário em useTargetRect.spec.tsx.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("mostra o primeiro passo", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    expect(await screen.findByText("Passo um")).toBeInTheDocument();
  });

  it("é um diálogo com rótulo acessível", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("Passo um");
  });

  /**
   * A regra central: alvo ausente pula o passo, o tour não trava.
   *
   * `useTargetRect` só reporta "ausente" depois de um timeout real (tempo de
   * parede — o teste não usa fake timers). Passo "dois" não tem `route`, então
   * o `TourOverlay` usa o timeout curto (800 ms), não os 3000 ms padrão do
   * hook. O `timeout` do `waitFor` dá uma folga sobre isso, não sobre 3000 ms.
   */
  it("pula em silêncio o passo cujo alvo não existe", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const user = userEvent.setup();
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    await screen.findByText("Passo um");
    await user.click(screen.getByRole("button", { name: /próximo/i }));

    await waitFor(
      () => expect(screen.getByText("Passo três")).toBeInTheDocument(),
      { timeout: 1500 },
    );
    expect(screen.queryByText("Passo dois")).not.toBeInTheDocument();
  });

  it("Esc encerra sem marcar como concluído", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId="solicitacoes" onClose={onClose} />);

    await screen.findByText("Passo um");
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledWith();
  });

  it("o último passo conclui a trilha", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId="solicitacoes" onClose={onClose} />);

    await screen.findByText("Passo um");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    // Passo "dois" não tem alvo nem `route`: o TourOverlay usa o timeout
    // curto (800 ms) do hook antes de pular para "três".
    await screen.findByText("Passo três", {}, { timeout: 1500 });
    await user.click(screen.getByRole("button", { name: /concluir/i }));

    expect(onClose).toHaveBeenCalledWith({ concluido: true });
  });

  it("mostra o progresso do passo atual", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    expect(await screen.findByText(/1 de 3/)).toBeInTheDocument();
  });

  /**
   * Task 9, passo 1: o balão fica montado entre um passo e outro — só o
   * conteúdo do bloco de texto (contador, título, corpo) troca. Sem
   * `aria-live`, alguns leitores de tela não reanunciam a troca, porque o
   * `aria-labelledby` do diálogo aponta para um `id` que muda junto.
   */
  it("anuncia a troca de passo para leitor de tela (aria-live no bloco de texto)", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const blocoDeTexto = dialogo.querySelector('[aria-live="polite"]');
    expect(blocoDeTexto).toBeInTheDocument();
    expect(blocoDeTexto).toHaveTextContent("Passo um");
  });

  /**
   * Task 9, passo 2: "2 de 5" lido sem contexto não diz que é o progresso do
   * tour. O texto visual continua igual — só ganha um `aria-label` explícito.
   */
  it("rotula o contador de passos com um aria-label descritivo", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const contador = await screen.findByText("1 de 3");
    expect(contador).toHaveAttribute("aria-label", "Passo 1 de 3");
  });

  /**
   * Task 9, passo 3: `text-neutral-400` sobre branco fica em ~2.5:1 e reprova
   * WCAG AA (4.5:1). O contador sobe para `text-neutral-500` (~4.75:1) e o
   * botão dispensivo "Sair do tour" sobe de `text-neutral-500` para
   * `text-neutral-600` (~7.82:1) — ver conta completa no relatório da task.
   */
  it("usa contraste AA no contador do passo e no botão 'Sair do tour'", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const contador = await screen.findByText("1 de 3");
    expect(contador).toHaveClass("text-neutral-500");
    expect(contador).not.toHaveClass("text-neutral-400");

    const sair = screen.getByRole("button", { name: /sair do tour/i });
    expect(sair).toHaveClass("text-neutral-600");
    expect(sair).not.toHaveClass("text-neutral-500");
  });

  it("passo obrigatório sem alvo encerra com aviso, sem concluir", async () => {
    // Não monta nenhum alvo — o único passo desta trilha é obrigatório e seu
    // alvo nunca existe.
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<TourOverlay trackId="documentos-do-medico" onClose={onClose} />);

    expect(
      await screen.findByText(
        /não conseguimos abrir esta parte/i,
        {},
        { timeout: 1500 },
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /entendi/i }));

    expect(onClose).toHaveBeenCalledWith();
    expect(onClose).not.toHaveBeenCalledWith({ concluido: true });
  });

  /**
   * O foco inicial precisa cair no DIÁLOGO em si, não no primeiro botão
   * ("Sair do tour" — a ação dispensiva, sempre primeira no DOM por spec
   * §3.1). Focar automaticamente nele faria um Enter no reflexo, ao abrir o
   * balão, encerrar o tour sem o usuário querer.
   * `dialogo.contains(activeElement)` sozinho passaria com o foco no botão
   * também — só `toBe(dialogo)` prova qual elemento recebeu o foco.
   */
  it("o foco inicial cai no diálogo, não no botão 'Sair do tour'", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    expect(document.activeElement).toBe(dialogo);
  });

  it("prende o foco dentro do balão nos dois sentidos", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const user = userEvent.setup();
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    // O foco tem que ENTRAR no balão sozinho, já no primeiro passo.
    expect(dialogo.contains(document.activeElement)).toBe(true);

    const focaveis = Array.from(
      dialogo.querySelectorAll<HTMLElement>("button"),
    );
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    ultimo.focus();
    await user.tab();
    expect(document.activeElement).toBe(primeiro);

    primeiro.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(ultimo);
  });

  /**
   * Achado 1(a) da revisão final: o container `fixed inset-0` cobria a
   * viewport inteira SEM `pointer-events-none`, capturando todo clique —
   * inclusive sobre o elemento destacado. O furo do spotlight é só visual
   * (máscara do SVG); sem isso o usuário não consegue clicar em nada durante
   * o tour, nem no botão que o passo está destacando.
   */
  it("libera cliques na página: só o balão captura ponteiro, o container não", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const container = dialogo.parentElement;

    expect(container).toHaveClass("pointer-events-none");
    expect(dialogo).toHaveClass("pointer-events-auto");
  });

  /** `pushMock` era declarado desde sempre neste arquivo e nunca era checado. */
  it("passo com `route` navega para a rota declarada", async () => {
    montarAlvos(["alvo-com-rota"]);
    render(<TourOverlay trackId="com-rota" onClose={vi.fn()} />);

    await screen.findByText("Passo com rota");

    expect(pushMock).toHaveBeenCalledWith("/configuracoes?tab=profile");
  });

  /**
   * `aguardaAcao` inverte a regra de "buscando" mudo: o alvo só existe depois
   * de o usuário clicar em algo (abrir um modal), então a espera É o passo —
   * o balão com a instrução precisa aparecer mesmo sem retângulo para
   * destacar, em vez do fundo escurecido silencioso de hoje.
   */
  it("mostra o balão com a instrução enquanto espera o alvo de um passo aguardaAcao", () => {
    // Checagem síncrona, logo após o mount: `estado` ainda é "buscando" aqui
    // (o timeout de 20s do `aguardaAcao` está só registrado, não disparado).
    // Um `await screen.findByText` correria o risco de atravessar os 800ms do
    // timeout curto e mostrar o balão pelo motivo ERRADO (estado "ausente").
    render(<TourOverlay trackId="aguarda-acao" onClose={vi.fn()} />);

    expect(screen.getByText("Clique em Nova consulta")).toBeInTheDocument();
  });

  /** Contraponto: passo comum (sem `aguardaAcao`) continua sem balão em "buscando". */
  it("não mostra o balão enquanto procura o alvo de um passo comum", () => {
    render(<TourOverlay trackId="passo-comum-sem-alvo" onClose={vi.fn()} />);

    expect(screen.queryByText("Passo comum")).not.toBeInTheDocument();
  });
});

/**
 * Achado 2 da revisão da Task 16: o mock de `fetchRequisitosPendente` acima
 * só evitava uma chamada axios real — nenhum caso exercitava o efeito de
 * carga, o corpo dinâmico ou o fallback. Estes três testes fecham a lacuna.
 */
describe("TourOverlay — passo 'requisitos' busca os rótulos reais", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    fetchRequisitosPendenteMock.mockReset();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("mostra os rótulos vindos do backend no corpo do passo", async () => {
    fetchRequisitosPendenteMock.mockResolvedValue([
      "Dados do Paciente",
      "Hospital",
    ]);
    montarAlvos(["alvo-antes", "alvo-requisitos"]);
    const user = userEvent.setup();
    render(
      <TourOverlay trackId="solicitacoes-requisitos" onClose={vi.fn()} />,
    );

    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));

    expect(
      await screen.findByText(
        "A solicitação só sai de Pendente com: Dados do Paciente, Hospital. O painel de pendências mostra o que falta a qualquer momento.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("CORPO ESTÁTICO — não deveria renderizar"),
    ).not.toBeInTheDocument();
  });

  it("cai para a frase genérica quando o backend não devolve nenhum rótulo", async () => {
    fetchRequisitosPendenteMock.mockResolvedValue([]);
    montarAlvos(["alvo-antes", "alvo-requisitos"]);
    const user = userEvent.setup();
    render(
      <TourOverlay trackId="solicitacoes-requisitos" onClose={vi.fn()} />,
    );

    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));

    expect(
      await screen.findByText(
        "A solicitação só sai de Pendente quando todos os itens obrigatórios estiverem completos. O painel de pendências mostra o que falta a qualquer momento.",
      ),
    ).toBeInTheDocument();
  });

  it("busca uma única vez por montagem, mesmo voltando e avançando de novo", async () => {
    fetchRequisitosPendenteMock.mockResolvedValue(["Dados do Paciente"]);
    montarAlvos(["alvo-antes", "alvo-requisitos"]);
    const user = userEvent.setup();
    render(
      <TourOverlay trackId="solicitacoes-requisitos" onClose={vi.fn()} />,
    );

    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await screen.findByText(/Dados do Paciente/);
    expect(fetchRequisitosPendenteMock).toHaveBeenCalledTimes(1);

    // Volta para "antes" e avança de novo para "requisitos": o efeito tem
    // guarda dupla (`passo?.key !== "requisitos"` e `requisitos !== null`) —
    // esta é a prova de que ela realmente impede a segunda chamada.
    await user.click(screen.getByRole("button", { name: /anterior/i }));
    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await screen.findByText(/Dados do Paciente/);

    expect(fetchRequisitosPendenteMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * Task 6: o passo "areas" da trilha `administracao` é o segundo caso (depois
 * de "requisitos") em que `corpoDoPasso` monta o texto em runtime a partir de
 * outro módulo — aqui, `PERMISSION_DESCRIPTIONS` (`lib/permissions.ts`), não
 * do backend. O teste prova a DERIVAÇÃO, não um texto copiado: lê os valores
 * do próprio módulo e afirma que todos aparecem no balão.
 */
/**
 * A `BottomNavBar` ocupa a base da tela no mobile (~72 px + safe-area). O
 * balão é posicionado por `top`/`left` calculados a partir do `rect` do
 * alvo — quando o alvo está colado no rodapé, o balão sem reserva cairia
 * atrás dela.
 */
describe("TourOverlay — balão não fica atrás da BottomNavBar no mobile", () => {
  const larguraOriginal = window.innerWidth;
  const alturaOriginal = window.innerHeight;

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "innerWidth", {
      value: 375,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 667,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      value: larguraOriginal,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: alturaOriginal,
      writable: true,
      configurable: true,
    });
  });

  it("mantém o balão acima da reserva de rodapé quando o alvo está colado na base da viewport", async () => {
    const alvo = document.createElement("button");
    alvo.setAttribute("data-tour", "alvo-um");
    alvo.getBoundingClientRect = () =>
      ({
        top: 620,
        left: 20,
        width: 100,
        height: 40,
        bottom: 660,
        right: 120,
      }) as DOMRect;
    document.body.appendChild(alvo);
    montarAlvos(["alvo-tres"]);

    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const top = parseFloat((dialogo as HTMLElement).style.top);
    const alturaEstimada = 190;

    expect(top + alturaEstimada).toBeLessThanOrEqual(667 - 88);
  });
});

describe("TourOverlay — passo 'areas' da trilha administracao", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("descreve as quatro permissões a partir de lib/permissions", async () => {
    await renderOverlayNoPasso("administracao", "areas");

    const balao = await screen.findByRole("dialog");
    for (const descricao of Object.values(PERMISSION_DESCRIPTIONS)) {
      expect(balao).toHaveTextContent(descricao);
    }
  });
});
