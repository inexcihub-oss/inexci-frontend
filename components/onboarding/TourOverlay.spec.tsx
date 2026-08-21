import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Track } from "@/lib/onboarding/tour-registry";
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

vi.mock("@/lib/onboarding/tour-registry", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/onboarding/tour-registry")
  >();
  return {
    ...original,
    trackById: (id: string) =>
      id === "documentos-do-medico" ? TRILHA_OBRIGATORIA : TRILHA,
    visibleSteps: (t: Track) => t.steps,
  };
});

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: () => ({
    viewer: { permissions: [], isDoctor: false, isAccountOwner: false },
  }),
}));

function montarAlvos(nomes: string[]) {
  for (const nome of nomes) {
    const el = document.createElement("button");
    el.setAttribute("data-tour", nome);
    el.textContent = nome;
    document.body.appendChild(el);
  }
}

describe("TourOverlay", () => {
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
});
