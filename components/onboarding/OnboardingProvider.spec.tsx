import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { OnboardingProvider, useOnboarding } from "./OnboardingProvider";

const patchMock = vi.fn().mockResolvedValue(undefined);
const resetMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/onboarding.service", () => ({
  onboardingService: {
    patch: (...args: unknown[]) => patchMock(...args),
    reset: () => resetMock(),
  },
}));

const authMock = {
  user: { onboardingState: undefined },
  permissions: [Permission.SOLICITACOES],
  isDoctor: false,
  isAccountOwner: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock,
}));

function Sonda() {
  const { state, tracks, completeStep, dismiss } = useOnboarding();
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="trilhas">{tracks.map((t) => t.id).join(",")}</span>
      <span data-testid="dispensado">
        {String(Boolean(state.checklistDismissedAt))}
      </span>
      <button onClick={() => completeStep("criar-solicitacao")}>marcar</button>
      <button onClick={dismiss}>dispensar</button>
    </div>
  );
}

describe("OnboardingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it("parte do estado vazio quando o usuário nunca começou", () => {
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("not_started");
  });

  it("expõe apenas as trilhas que o usuário pode ver", () => {
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    expect(screen.getByTestId("trilhas")).toHaveTextContent("solicitacoes");
  });

  it("atualiza o estado local na hora, antes do request", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("marcar"));

    expect(screen.getByTestId("status")).toHaveTextContent("in_progress");
  });

  it("agrupa escritas seguidas num único PATCH", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("marcar"));
    await user.click(screen.getByText("dispensar"));

    expect(patchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  /** Um 500 ao marcar um checkbox não pode derrubar a tela. */
  it("engole a falha do PATCH sem quebrar a interface", async () => {
    patchMock.mockRejectedValueOnce(new Error("500"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("marcar"));
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByTestId("status")).toHaveTextContent("in_progress");
  });
});
