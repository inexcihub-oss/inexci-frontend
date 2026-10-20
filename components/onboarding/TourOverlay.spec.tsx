import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PERMISSION_DESCRIPTIONS } from "@/lib/permissions";
import type { TrackId } from "@/lib/onboarding/state";
import type { Track } from "@/lib/onboarding/tour-registry";
import { trackById, visibleSteps } from "@/lib/onboarding/tour-registry";
import { STATUS_NUMBER_TO_STRING } from "@/services/surgery-request.service";
import { TourOverlay } from "./TourOverlay";
import { TIMEOUT_AGUARDA_ACAO_MS } from "./useTargetRect";

const trilhaDeTeste = (id: string) => id as TrackId;

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/solicitacoes-cirurgicas",
}));

const TRILHA: Track = {
  id: trilhaDeTeste("trilha-generica"),
  label: "Criar e enviar uma solicitação",
  descricao: "…",
  stepKey: "criar-solicitacao",
  steps: [
    { key: "um", titulo: "Passo um", corpo: "Corpo um", target: "alvo-um" },
    { key: "dois", titulo: "Passo dois", corpo: "Corpo dois", target: "sem-alvo" },
    { key: "tres", titulo: "Passo três", corpo: "Corpo três", target: "alvo-tres" },
  ],
};

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

const TRILHA_REQUISITOS: Track = {
  id: trilhaDeTeste("solicitacoes-requisitos"),
  label: "Criar e enviar uma solicitação",
  descricao: "…",
  stepKey: "criar-solicitacao",
  steps: [
    { key: "antes", titulo: "Passo antes", corpo: "Corpo antes", target: "alvo-antes" },
    {
      key: "requisitos",
      titulo: "Complete antes de enviar",
      corpo: "CORPO ESTÁTICO — não deveria renderizar",
      target: "alvo-requisitos",
    },
  ],
};

const TRILHA_COM_ROTA: Track = {
  id: trilhaDeTeste("com-rota"),
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

const TRILHA_AGUARDA_ACAO: Track = {
  id: trilhaDeTeste("aguarda-acao"),
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
      keepOpenWhenTargetMissing: true,
    },
  ],
};

const TRILHA_COM_ACAO: Track = {
  id: trilhaDeTeste("com-acao"),
  label: "Trilha com passo acao",
  descricao: "…",
  stepKey: "marcar-consulta",
  steps: [
    {
      key: "aciona",
      titulo: "Passo com ação",
      corpo: "Corpo do passo com ação.",
      target: "alvo-acionado",
      acao: "abrir-algo",
    },
  ],
};

const TRILHA_ACAO_AO_AVANCAR: Track = {
  id: trilhaDeTeste("acao-ao-avancar"),
  label: "Trilha com ação ao avançar",
  descricao: "…",
  stepKey: "marcar-consulta",
  steps: [
    {
      key: "confirmar",
      titulo: "Confirme a etapa",
      corpo: "Corpo da etapa.",
      target: "alvo-confirmar",
      acaoAoAvancar: "concluir-algo",
    },
    {
      key: "revisar",
      titulo: "Revise a etapa",
      corpo: "Corpo da revisão.",
      target: "alvo-revisar",
    },
  ],
};

const TRILHA_PASSO_COMUM: Track = {
  id: trilhaDeTeste("passo-comum-sem-alvo"),
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

const TRILHA_SEM_ALVO_DEPOIS_COM_ALVO: Track = {
  id: trilhaDeTeste("sem-alvo-depois-com-alvo"),
  label: "Trilha sem alvo seguida de alvo já presente",
  descricao: "…",
  stepKey: "criar-solicitacao",
  steps: [
    { key: "sem-alvo", titulo: "Passo sem alvo", corpo: "…" },
    {
      key: "com-alvo",
      titulo: "Passo com alvo já presente",
      corpo: "…",
      target: "alvo-ja-presente",
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
      if (id === "sem-alvo-depois-com-alvo")
        return TRILHA_SEM_ALVO_DEPOIS_COM_ALVO;
      if (id === "com-acao") return TRILHA_COM_ACAO;
      if (id === "acao-ao-avancar") return TRILHA_ACAO_AO_AVANCAR;
      if (id === "administracao") return original.trackById(id);
      if (id === "solicitacoes") return original.trackById(id);
      return TRILHA;
    },
    visibleSteps: (t: Track) => t.steps,
  };
});

const { executarAcaoMock } = vi.hoisted(() => ({
  executarAcaoMock: vi.fn(),
}));

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: () => ({
    viewer: { permissions: [], isDoctor: false, isAccountOwner: false },
    executarAcao: executarAcaoMock,
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

async function renderOverlayNoPasso(id: string, key: string) {
  const trackId = trilhaDeTeste(id);
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
    executarAcaoMock.mockReset().mockReturnValue(true);
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

  it("mostra o primeiro passo", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    expect(await screen.findByText("Passo um")).toBeInTheDocument();
  });

  it("é um diálogo com rótulo acessível", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("Passo um");
  });

  it("pula em silêncio o passo cujo alvo não existe", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    await screen.findByText("Passo um");
    await user.click(screen.getByRole("button", { name: /próximo/i }));

    await waitFor(
      () => expect(screen.getByText("Passo três")).toBeInTheDocument(),
      { timeout: 1500 },
    );
    expect(screen.queryByText("Passo dois")).not.toBeInTheDocument();
  });

  it("não fecha o tour quando um passo sem alvo é seguido por um passo cujo alvo já está no DOM", async () => {
    montarAlvos(["alvo-ja-presente"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <TourOverlay
        trackId={trilhaDeTeste("sem-alvo-depois-com-alvo")}
        onClose={onClose}
      />,
    );

    await screen.findByText("Passo sem alvo");
    await user.click(screen.getByRole("button", { name: /próximo/i }));

    await screen.findByText("Passo com alvo já presente");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Esc encerra sem marcar como concluído", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={onClose} />);

    await screen.findByText("Passo um");
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledWith();
  });

  it("mostra a saída em qualquer passo e encerra sem concluir", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Sair do tour" }));

    expect(onClose).toHaveBeenCalledWith();
  });

  it("permite arrastar a explicação para não cobrir a área de interesse", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const alca = dialogo.querySelector("[data-tour-drag-handle]");
    expect(alca).not.toBeNull();

    fireEvent.pointerDown(alca!, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(alca!, {
      pointerId: 1,
      clientX: 140,
      clientY: 130,
    });
    fireEvent.pointerUp(alca!, { pointerId: 1 });

    expect((dialogo as HTMLElement).style.transform).toContain(
      "translate3d(40px, 30px, 0)",
    );
  });

  it("o último passo conclui a trilha", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={onClose} />);

    await screen.findByText("Passo um");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await screen.findByText("Passo três", {}, { timeout: 1500 });
    await user.click(screen.getByRole("button", { name: /concluir/i }));

    expect(onClose).toHaveBeenCalledWith({ concluido: true });
  });

  it("mostra o progresso do passo atual", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    expect(await screen.findByText(/1 de 3/)).toBeInTheDocument();
  });

  it("anuncia a troca de passo para leitor de tela (aria-live no bloco de texto)", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const blocoDeTexto = dialogo.querySelector('[aria-live="polite"]');
    expect(blocoDeTexto).toBeInTheDocument();
    expect(blocoDeTexto).toHaveTextContent("Passo um");
  });

  it("rotula o contador de passos com um aria-label descritivo", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const contador = await screen.findByText("1 de 3");
    expect(contador).toHaveAttribute("aria-label", "Passo 1 de 3");
  });

  it("usa contraste AA no contador do passo e no botão 'Sair do tour'", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const contador = await screen.findByText("1 de 3");
    expect(contador).toHaveClass("text-neutral-500");
    expect(contador).not.toHaveClass("text-neutral-400");

    const sair = screen.getByRole("button", { name: /sair do tour/i });
    expect(sair).toHaveClass("text-primary-700");
    expect(sair).toHaveClass("text-xs");
    expect(sair).toHaveClass("font-medium");
    expect(sair).not.toHaveClass("underline");
    expect(sair).not.toHaveClass("border");
  });

  it("passo obrigatório sem alvo encerra com aviso, sem concluir", async () => {
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

  it("o foco inicial cai no diálogo, não no botão 'Sair do tour'", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    expect(document.activeElement).toBe(dialogo);
  });

  it("prende o foco dentro do balão nos dois sentidos", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
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

  it("libera cliques na página: só o balão captura ponteiro, o container não", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const container = dialogo.parentElement;

    expect(container).toHaveClass("pointer-events-none");
    expect(dialogo).toHaveClass("pointer-events-auto");
  });

  it("passo com `route` navega para a rota declarada", async () => {
    montarAlvos(["alvo-com-rota"]);
    render(<TourOverlay trackId={trilhaDeTeste("com-rota")} onClose={vi.fn()} />);

    await screen.findByText("Passo com rota");

    expect(pushMock).toHaveBeenCalledWith("/configuracoes?tab=profile");
  });

  it("mostra o balão com a instrução enquanto espera o alvo de um passo aguardaAcao", () => {
    render(<TourOverlay trackId={trilhaDeTeste("aguarda-acao")} onClose={vi.fn()} />);

    expect(screen.getByText("Clique em Nova consulta")).toBeInTheDocument();
  });

  it("não avança sozinho quando o alvo de uma etapa intencionalmente some", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<TourOverlay trackId={trilhaDeTeste("aguarda-acao")} onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(TIMEOUT_AGUARDA_ACAO_MS + 100);
    });

    expect(screen.getByText("Clique em Nova consulta")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("não mostra o balão enquanto procura o alvo de um passo comum", () => {
    render(<TourOverlay trackId={trilhaDeTeste("passo-comum-sem-alvo")} onClose={vi.fn()} />);

    expect(screen.queryByText("Passo comum")).not.toBeInTheDocument();
  });

  it("executa a ação do passo ao entrar nele", async () => {
    montarAlvos(["alvo-acionado"]);
    render(<TourOverlay trackId={trilhaDeTeste("com-acao")} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(executarAcaoMock).toHaveBeenCalledWith("abrir-algo"),
    );
  });

  it("executa a ação de confirmação somente ao clicar em Próximo", async () => {
    montarAlvos(["alvo-confirmar", "alvo-revisar"]);
    const user = userEvent.setup();
    render(<TourOverlay trackId={trilhaDeTeste("acao-ao-avancar")} onClose={vi.fn()} />);

    await screen.findByText("Confirme a etapa");
    expect(executarAcaoMock).not.toHaveBeenCalledWith("concluir-algo");

    await user.click(screen.getByRole("button", { name: "Próximo" }));

    expect(executarAcaoMock).toHaveBeenCalledWith("concluir-algo");
    expect(await screen.findByText("Revise a etapa")).toBeInTheDocument();
  });

  it("tenta de novo a cada 150ms até a ação ser encontrada", async () => {
    vi.useFakeTimers();
    executarAcaoMock
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValue(true);
    montarAlvos(["alvo-acionado"]);
    render(<TourOverlay trackId={trilhaDeTeste("com-acao")} onClose={vi.fn()} />);

    expect(executarAcaoMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(executarAcaoMock).toHaveBeenCalledTimes(2);
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    expect(executarAcaoMock).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});

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
      <TourOverlay trackId={trilhaDeTeste("solicitacoes-requisitos")} onClose={vi.fn()} />,
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
      <TourOverlay trackId={trilhaDeTeste("solicitacoes-requisitos")} onClose={vi.fn()} />,
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
      <TourOverlay trackId={trilhaDeTeste("solicitacoes-requisitos")} onClose={vi.fn()} />,
    );

    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await screen.findByText(/Dados do Paciente/);
    expect(fetchRequisitosPendenteMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /anterior/i }));
    await screen.findByText("Passo antes");
    await user.click(screen.getByRole("button", { name: /próximo/i }));
    await screen.findByText(/Dados do Paciente/);

    expect(fetchRequisitosPendenteMock).toHaveBeenCalledTimes(1);
  });
});

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

    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const top = parseFloat((dialogo as HTMLElement).style.top);
    const alturaEstimada = 360;

    expect(top + alturaEstimada).toBeLessThanOrEqual(667 - 88);
  });
});

describe("TourOverlay — balão não cobre o próprio alvo", () => {
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

  it("empurra o balão para o lado quando a posição calculada colidiria com o próprio alvo", async () => {
    Object.defineProperty(window, "innerWidth", {
      value: 1280,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 300,
      writable: true,
      configurable: true,
    });

    const alvo = document.createElement("button");
    alvo.setAttribute("data-tour", "alvo-um");
    alvo.getBoundingClientRect = () =>
      ({
        top: 150,
        left: 900,
        width: 100,
        height: 40,
        bottom: 190,
        right: 1000,
      }) as DOMRect;
    document.body.appendChild(alvo);
    montarAlvos(["alvo-tres"]);

    render(<TourOverlay trackId={trilhaDeTeste("trilha-generica")} onClose={vi.fn()} />);

    const dialogo = await screen.findByRole("dialog");
    const top = parseFloat((dialogo as HTMLElement).style.top);
    const left = parseFloat((dialogo as HTMLElement).style.left);
    const alturaEstimada = 360;
    const larguraBalao = 320;

    const sobrepoeVertical = top < 190 && top + alturaEstimada > 150;
    const sobrepoeHorizontal = left < 1000 && left + larguraBalao > 900;

    expect(sobrepoeVertical && sobrepoeHorizontal).toBe(false);
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

describe("TourOverlay — passo 'kanban-status' da trilha solicitacoes", () => {
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

  it("lista os nove status a partir de STATUS_NUMBER_TO_STRING", async () => {
    await renderOverlayNoPasso("solicitacoes", "kanban-status");

    const balao = await screen.findByRole("dialog");
    for (const rotulo of Object.values(STATUS_NUMBER_TO_STRING)) {
      expect(balao).toHaveTextContent(rotulo);
    }
  });
});
