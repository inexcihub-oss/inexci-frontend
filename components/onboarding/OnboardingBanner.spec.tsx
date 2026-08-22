import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import type { Track } from "@/lib/onboarding/tour-registry";
import { emptyOnboardingState } from "@/lib/onboarding/state";
import { OnboardingBanner } from "./OnboardingBanner";

const startTour = vi.fn();
const dismiss = vi.fn();

const TRILHA: Track = {
  id: "solicitacoes",
  label: "Criar e enviar uma solicitação",
  descricao: "Do wizard ao envio.",
  stepKey: "criar-solicitacao",
  permission: Permission.SOLICITACOES,
  steps: [],
};

const TRILHA_2: Track = {
  id: "documentos-do-medico",
  label: "Configurar sua assinatura",
  descricao: "Obrigatório para os documentos.",
  stepKey: "assinatura-do-medico",
  requiresDoctor: true,
  steps: [],
};

let contexto = {
  state: emptyOnboardingState(),
  tracks: [TRILHA],
  startTour,
  dismiss,
  isChecklistVisible: true,
};

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: () => contexto,
}));

describe("OnboardingBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contexto = {
      state: emptyOnboardingState(),
      tracks: [TRILHA],
      startTour,
      dismiss,
      isChecklistVisible: true,
    };
  });

  it("mostra o título, o progresso e a próxima trilha incompleta", () => {
    render(<OnboardingBanner />);

    expect(screen.getByText("Primeiros passos")).toBeInTheDocument();
    expect(screen.getByText("0 de 1")).toBeInTheDocument();
    expect(
      screen.getByText(/Próximo: Criar e enviar uma solicitação/),
    ).toBeInTheDocument();
  });

  it("clicar em Continuar abre o tour da próxima trilha incompleta", async () => {
    const user = userEvent.setup();
    render(<OnboardingBanner />);

    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(startTour).toHaveBeenCalledWith("solicitacoes");
  });

  /**
   * O CTA precisa apontar para a trilha incompleta que vem DEPOIS de outras
   * já feitas, não para a primeira do array — senão "Continuar" reabriria um
   * tour já concluído enquanto ainda sobra trabalho de verdade.
   */
  it("o CTA aponta para a próxima trilha incompleta, não para a primeira da lista", async () => {
    contexto.tracks = [TRILHA, TRILHA_2];
    contexto.state = {
      ...emptyOnboardingState(),
      completedSteps: { "criar-solicitacao": "2026-08-21T00:00:00.000Z" },
    };
    const user = userEvent.setup();
    render(<OnboardingBanner />);

    expect(
      screen.getByText(/Próximo: Configurar sua assinatura/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continuar/i }));

    expect(startTour).toHaveBeenCalledWith("documentos-do-medico");
  });

  it("dispensar chama o provider", async () => {
    const user = userEvent.setup();
    render(<OnboardingBanner />);

    await user.click(
      screen.getByRole("button", { name: /dispensar primeiros passos/i }),
    );

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("não renderiza nada quando dispensado", () => {
    contexto.isChecklistVisible = false;
    const { container } = render(<OnboardingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  /** Um usuário sem área nenhuma não pode ver um banner vazio. */
  it("não renderiza sem trilhas visíveis", () => {
    contexto.tracks = [];
    const { container } = render(<OnboardingBanner />);

    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a mensagem de conclusão em vez do progresso quando status é completed", () => {
    contexto.state = { ...emptyOnboardingState(), status: "completed" };
    render(<OnboardingBanner />);

    expect(
      screen.getByText(
        "Tudo pronto. Você pode rever qualquer passo em Configurações.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continuar/i }),
    ).not.toBeInTheDocument();
  });

  it("mesmo concluído, Dispensar continua sendo a saída", async () => {
    contexto.state = { ...emptyOnboardingState(), status: "completed" };
    const user = userEvent.setup();
    render(<OnboardingBanner />);

    await user.click(
      screen.getByRole("button", { name: /dispensar primeiros passos/i }),
    );

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  /**
   * Sem trilha incompleta (todas concluídas), o CTA some — mas o progresso
   * continua visível. Só o `promoteIfComplete` do provider decide quando o
   * status vira "completed"; a banner não deve fingir um CTA para uma trilha
   * que já não precisa de ação.
   */
  it("sem próxima trilha incompleta, esconde o CTA mas mantém o progresso", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      completedSteps: { "criar-solicitacao": "2026-08-21T00:00:00.000Z" },
    };
    render(<OnboardingBanner />);

    expect(screen.getByText("1 de 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /continuar/i }),
    ).not.toBeInTheDocument();
  });

  it("expõe o progresso também para leitor de tela", () => {
    // Duas trilhas, uma concluída: `valuenow=1` e `valuemax=2` são valores
    // distintos, então um swap entre os dois atributos falha aqui. Com uma
    // trilha só, `1` e `1` esconderiam a troca.
    contexto.tracks = [TRILHA, TRILHA_2];
    contexto.state = {
      ...emptyOnboardingState(),
      completedSteps: { "criar-solicitacao": "2026-08-21T00:00:00.000Z" },
    };
    render(<OnboardingBanner />);

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "1");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "2");
  });
});
