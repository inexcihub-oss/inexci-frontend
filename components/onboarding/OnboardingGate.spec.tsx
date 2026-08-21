import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { emptyOnboardingState } from "@/lib/onboarding/state";
import { OnboardingGate } from "./OnboardingGate";

let contexto = {
  state: emptyOnboardingState(),
  tracks: [{ id: "solicitacoes" }],
  activeTour: null as string | null,
  closeTour: vi.fn(),
};

let auth = {
  consents: { requiredConsentsAccepted: true },
  isAccountOwner: false,
  subscription: { subscription: { status: "active" } },
};

vi.mock("./OnboardingProvider", () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useOnboarding: () => contexto,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

vi.mock("./WelcomeModal", () => ({
  WelcomeModal: () => <div>modal de boas-vindas</div>,
}));

vi.mock("./TourOverlay", () => ({
  TourOverlay: () => <div>tour ativo</div>,
}));

describe("OnboardingGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contexto = {
      state: emptyOnboardingState(),
      tracks: [{ id: "solicitacoes" }],
      activeTour: null,
      closeTour: vi.fn(),
    };
    auth = {
      consents: { requiredConsentsAccepted: true },
      isAccountOwner: false,
      subscription: { subscription: { status: "active" } },
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

  /** LGPD primeiro: dois diálogos empilhados furariam a exigência de aceite. */
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

  /** Ensinar a usar uma conta bloqueada é pior do que não ensinar nada. */
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

    expect(screen.getByText("tour ativo")).toBeInTheDocument();
  });
});
