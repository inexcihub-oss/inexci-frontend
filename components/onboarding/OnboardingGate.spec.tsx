import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { emptyOnboardingState } from "@/lib/onboarding/state";
import type { Track } from "@/lib/onboarding/tour-registry";
import { OnboardingGate } from "./OnboardingGate";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

let contadorDeMontagens = 0;

let contexto: {
  state: ReturnType<typeof emptyOnboardingState>;
  tracks: Pick<Track, "id" | "stepKey">[];
  activeTour: string | null;
  closeTour: ReturnType<typeof vi.fn>;
  startTour: ReturnType<typeof vi.fn>;
} = {
  state: emptyOnboardingState(),
  tracks: [{ id: "solicitacoes", stepKey: "criar-solicitacao" }],
  activeTour: null,
  closeTour: vi.fn(),
  startTour: vi.fn(),
};

let auth = {
  consents: { requiredConsentsAccepted: true },
  isAccountOwner: false,
  subscription: { subscription: { status: "active" } },
  permissions: [Permission.ATENDIMENTO],
};

vi.mock("./OnboardingProvider", () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useOnboarding: () => contexto,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

vi.mock("./WelcomeModal", () => ({
  WelcomeModal: ({
    onFinish,
    onSkip,
  }: {
    onFinish: () => void;
    onSkip: () => void;
  }) => (
    <div>
      modal de boas-vindas
      <button onClick={onFinish}>concluir boas-vindas</button>
      <button onClick={onSkip}>pular boas-vindas</button>
    </div>
  ),
}));

vi.mock("./OnboardingCelebration", () => ({
  OnboardingCelebration: ({ onDone }: { onDone: () => void }) => (
    <div>
      celebração ativa
      <button onClick={onDone}>fechar celebração</button>
    </div>
  ),
}));

vi.mock("./TourOverlay", () => ({
  TourOverlay: ({ trackId }: { trackId: string }) => {
    const [montagem] = useState(() => ++contadorDeMontagens);
    return (
      <div>
        tour ativo: {trackId} (montagem {montagem})
      </div>
    );
  },
}));

describe("OnboardingGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contadorDeMontagens = 0;
    contexto = {
      state: emptyOnboardingState(),
      tracks: [{ id: "solicitacoes", stepKey: "criar-solicitacao" }],
      activeTour: null,
      closeTour: vi.fn(),
      startTour: vi.fn(),
    };
    auth = {
      consents: { requiredConsentsAccepted: true },
      isAccountOwner: false,
      subscription: { subscription: { status: "active" } },
      permissions: [Permission.ATENDIMENTO],
    };
  });

  it("sempre renderiza a página por baixo", () => {
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("mostra o modal para quem nunca viu", () => {
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(screen.getByText("modal de boas-vindas")).toBeInTheDocument();
  });

  it("ao concluir as boas-vindas abre a próxima trilha incompleta", async () => {
    const user = userEvent.setup();
    contexto.tracks = [
      {
        id: "solicitacoes",
        stepKey: "criar-solicitacao",
      },
    ];
    contexto.state = {
      ...emptyOnboardingState(),
      welcomeSeenAt: null,
    };
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    await user.click(screen.getByRole("button", { name: /concluir boas-vindas/i }));

    expect(contexto.startTour).toHaveBeenCalledWith("solicitacoes");
  });

  it("não mostra o modal para quem já viu", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      welcomeSeenAt: "2026-08-01T00:00:00.000Z",
    };
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(
      screen.queryByText("modal de boas-vindas"),
    ).not.toBeInTheDocument();
  });

  it("cala enquanto houver consentimento pendente", () => {
    auth.consents = { requiredConsentsAccepted: false };
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(
      screen.queryByText("modal de boas-vindas"),
    ).not.toBeInTheDocument();
  });

  it("cala quando a assinatura do dono está bloqueada", () => {
    auth.isAccountOwner = true;
    auth.subscription = { subscription: { status: "suspended" } };
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(
      screen.queryByText("modal de boas-vindas"),
    ).not.toBeInTheDocument();
  });

  it("mostra o modal mesmo sem nenhuma trilha visível", () => {
    contexto.tracks = [];
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(screen.getByText("modal de boas-vindas")).toBeInTheDocument();
  });

  it("renderiza o tour quando há trilha ativa", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      welcomeSeenAt: "2026-08-01T00:00:00.000Z",
    };
    contexto.activeTour = "solicitacoes";
    render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(screen.getByText(/tour ativo: solicitacoes/)).toBeInTheDocument();
  });

  it("remonta o TourOverlay ao trocar de trilha ativa", () => {
    contexto.state = {
      ...emptyOnboardingState(),
      welcomeSeenAt: "2026-08-01T00:00:00.000Z",
    };
    contexto.activeTour = "solicitacoes";
    const { rerender } = render(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(
      screen.getByText(/tour ativo: solicitacoes \(montagem 1\)/),
    ).toBeInTheDocument();

    contexto.activeTour = "cadastros";
    rerender(
      <OnboardingGate>
        <p>conteúdo</p>
      </OnboardingGate>,
    );

    expect(
      screen.getByText(/tour ativo: cadastros \(montagem 2\)/),
    ).toBeInTheDocument();
  });

  describe("celebração de conclusão", () => {
    it("mostra a celebração quando o status vira completed NESTA sessão", () => {
      contexto.state = {
        ...emptyOnboardingState(),
        welcomeSeenAt: "2026-08-01T00:00:00.000Z",
        status: "in_progress",
      };
      const { rerender } = render(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      expect(screen.queryByText("celebração ativa")).not.toBeInTheDocument();

      contexto.state = { ...contexto.state, status: "completed" };
      rerender(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      expect(screen.getByText("celebração ativa")).toBeInTheDocument();
    });

    it("navega para a casa do usuário (resolveHome) ao concluir tudo", () => {
      contexto.state = {
        ...emptyOnboardingState(),
        welcomeSeenAt: "2026-08-01T00:00:00.000Z",
        status: "in_progress",
      };
      const { rerender } = render(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      expect(pushMock).not.toHaveBeenCalled();

      contexto.state = { ...contexto.state, status: "completed" };
      rerender(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      expect(pushMock).toHaveBeenCalledWith("/atendimento");
    });

    it("não mostra a celebração quando completed já chega pronto, sem transição nesta sessão", () => {
      contexto.state = {
        ...emptyOnboardingState(),
        welcomeSeenAt: "2026-08-01T00:00:00.000Z",
        status: "completed",
      };
      render(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      expect(screen.queryByText("celebração ativa")).not.toBeInTheDocument();
    });

    it("a celebração some quando o próprio componente avisa que terminou", async () => {
      contexto.state = {
        ...emptyOnboardingState(),
        welcomeSeenAt: "2026-08-01T00:00:00.000Z",
        status: "in_progress",
      };
      const { rerender } = render(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );
      contexto.state = { ...contexto.state, status: "completed" };
      rerender(
        <OnboardingGate>
          <p>conteúdo</p>
        </OnboardingGate>,
      );

      const user = userEvent.setup();
      await user.click(screen.getByText("fechar celebração"));

      expect(screen.queryByText("celebração ativa")).not.toBeInTheDocument();
    });
  });
});
