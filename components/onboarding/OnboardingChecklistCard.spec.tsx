import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import type { Track } from "@/lib/onboarding/tour-registry";
import { emptyOnboardingState } from "@/lib/onboarding/state";
import { OnboardingChecklistCard } from "./OnboardingChecklistCard";

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
  id: "assinatura",
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

describe("OnboardingChecklistCard", () => {
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

  it("lista as trilhas visíveis", () => {
    render(<OnboardingChecklistCard />);

    expect(
      screen.getByText("Criar e enviar uma solicitação"),
    ).toBeInTheDocument();
  });

  it("mostra o progresso", () => {
    render(<OnboardingChecklistCard />);

    expect(screen.getByText("0 de 1")).toBeInTheDocument();
  });

  it("clicar em Ver abre o tour da trilha", async () => {
    const user = userEvent.setup();
    render(<OnboardingChecklistCard />);

    await user.click(screen.getByRole("button", { name: /ver/i }));

    expect(startTour).toHaveBeenCalledWith("solicitacoes");
  });

  it("dispensar chama o provider", async () => {
    const user = userEvent.setup();
    render(<OnboardingChecklistCard />);

    await user.click(screen.getByRole("button", { name: /dispensar/i }));

    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("marca a trilha já concluída", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      completedSteps: { "criar-solicitacao": "2026-08-21T00:00:00.000Z" },
    };
    render(<OnboardingChecklistCard />);

    expect(screen.getByText("1 de 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refazer/i }),
    ).toBeInTheDocument();
  });

  it("não renderiza nada quando dispensado", () => {
    contexto.isChecklistVisible = false;
    const { container } = render(<OnboardingChecklistCard />);

    expect(container).toBeEmptyDOMElement();
  });

  /** Um usuário sem área nenhuma não pode ver um card vazio. */
  it("não renderiza sem trilhas visíveis", () => {
    contexto.tracks = [];
    const { container } = render(<OnboardingChecklistCard />);

    expect(container).toBeEmptyDOMElement();
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
    render(<OnboardingChecklistCard />);

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "1");
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "2");
  });
});
