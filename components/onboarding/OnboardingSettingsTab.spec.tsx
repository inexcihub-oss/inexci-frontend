import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import type { Track } from "@/lib/onboarding/tour-registry";
import { emptyOnboardingState } from "@/lib/onboarding/state";
import { OnboardingSettingsTab } from "./OnboardingSettingsTab";

const restart = vi.fn().mockResolvedValue(undefined);
const startTour = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ permissions: [Permission.ATENDIMENTO] }),
}));

const TRILHA: Track = {
  id: "solicitacoes",
  label: "Criar e enviar uma solicitação",
  descricao: "Do wizard ao envio.",
  stepKey: "criar-solicitacao",
  permission: Permission.SOLICITACOES,
  steps: [],
};

let contexto = {
  state: emptyOnboardingState(),
  tracks: [TRILHA],
  startTour,
  restart,
};

vi.mock("./OnboardingProvider", () => ({ useOnboarding: () => contexto }));

describe("OnboardingSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contexto = {
      state: emptyOnboardingState(),
      tracks: [TRILHA],
      startTour,
      restart,
    };
  });

  it("lista as trilhas disponíveis", () => {
    render(<OnboardingSettingsTab />);

    expect(
      screen.getByText("Criar e enviar uma solicitação"),
    ).toBeInTheDocument();
  });

  it("permite rodar uma trilha avulsa", async () => {
    const user = userEvent.setup();
    render(<OnboardingSettingsTab />);

    await user.click(screen.getByRole("button", { name: /ver/i }));

    expect(startTour).toHaveBeenCalledWith("solicitacoes");
  });

  it("refazer reinicia o onboarding", async () => {
    const user = userEvent.setup();
    render(<OnboardingSettingsTab />);

    await user.click(
      screen.getByRole("button", { name: /refazer o onboarding/i }),
    );

    expect(restart).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/atendimento");
  });

  /** A aba existe justamente para quem dispensou tudo. */
  it("aparece mesmo com o onboarding dispensado", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      status: "dismissed",
      checklistDismissedAt: "2026-08-01T00:00:00.000Z",
    };
    render(<OnboardingSettingsTab />);

    expect(
      screen.getByRole("button", { name: /refazer o onboarding/i }),
    ).toBeInTheDocument();
  });

  it("aparece e permite refazer mesmo sem trilha visível", async () => {
    // Colaborador sem área nenhuma: não vê card em home alguma, e esta aba é o
    // único caminho de volta que ele tem.
    contexto.tracks = [];
    const user = userEvent.setup();
    render(<OnboardingSettingsTab />);

    expect(
      screen.getByText(/as trilhas aparecem aqui/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /refazer o onboarding/i }),
    );
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it("avisa quando reiniciar falha, sem travar o botão", async () => {
    restart.mockRejectedValueOnce(new Error("500"));
    const user = userEvent.setup();
    render(<OnboardingSettingsTab />);

    await user.click(
      screen.getByRole("button", { name: /refazer o onboarding/i }),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /refazer o onboarding/i }),
    ).toBeEnabled();
  });
});
