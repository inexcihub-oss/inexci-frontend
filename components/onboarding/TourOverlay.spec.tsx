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

vi.mock("@/lib/onboarding/tour-registry", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/lib/onboarding/tour-registry")
  >();
  return {
    ...original,
    trackById: () => TRILHA,
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
   * `useTargetRect` só reporta "ausente" depois do seu timeout padrão
   * (3000 ms, tempo real — o teste não usa fake timers). O `timeout` maior
   * no `waitFor` é para acomodar essa espera real, não uma folga arbitrária.
   */
  it(
    "pula em silêncio o passo cujo alvo não existe",
    async () => {
      montarAlvos(["alvo-um", "alvo-tres"]);
      const user = userEvent.setup();
      render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

      await screen.findByText("Passo um");
      await user.click(screen.getByRole("button", { name: /próximo/i }));

      await waitFor(
        () => expect(screen.getByText("Passo três")).toBeInTheDocument(),
        { timeout: 4000 },
      );
      expect(screen.queryByText("Passo dois")).not.toBeInTheDocument();
    },
    8000,
  );

  it("Esc encerra sem marcar como concluído", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TourOverlay trackId="solicitacoes" onClose={onClose} />);

    await screen.findByText("Passo um");
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledWith();
  });

  it(
    "o último passo conclui a trilha",
    async () => {
      montarAlvos(["alvo-um", "alvo-tres"]);
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<TourOverlay trackId="solicitacoes" onClose={onClose} />);

      await screen.findByText("Passo um");
      await user.click(screen.getByRole("button", { name: /próximo/i }));
      // Passo "dois" não tem alvo: precisa esperar o timeout real do
      // useTargetRect (3000 ms) antes de pular para "três".
      await screen.findByText("Passo três", {}, { timeout: 4000 });
      await user.click(screen.getByRole("button", { name: /concluir/i }));

      expect(onClose).toHaveBeenCalledWith({ concluido: true });
    },
    8000,
  );

  it("mostra o progresso do passo atual", async () => {
    montarAlvos(["alvo-um", "alvo-tres"]);
    render(<TourOverlay trackId="solicitacoes" onClose={vi.fn()} />);

    expect(await screen.findByText(/1 de 3/)).toBeInTheDocument();
  });
});
