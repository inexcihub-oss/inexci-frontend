import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { OnboardingProvider, useOnboarding } from "./OnboardingProvider";

const patchMock = vi.fn().mockResolvedValue(undefined);
const resetMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/services/onboarding.service", () => ({
  onboardingService: {
    patch: (...args: unknown[]) => patchMock(...args),
    reset: () => resetMock(),
  },
}));

// Espelha a forma real de `lib/logger.ts` — não tem `info`.
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
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
  const { state, tracks, completeStep, dismiss, restart } = useOnboarding();
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="trilhas">{tracks.map((t) => t.id).join(",")}</span>
      <span data-testid="dispensado">
        {String(Boolean(state.checklistDismissedAt))}
      </span>
      <button onClick={() => completeStep("criar-solicitacao")}>marcar</button>
      <button onClick={dismiss}>dispensar</button>
      <button onClick={() => void restart()}>reiniciar</button>
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
    // Sem isto, uma implementação que aguardasse o PATCH antes do setState
    // também passaria — o teste não provaria otimismo nenhum.
    expect(patchMock).not.toHaveBeenCalled();
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
    // Confirma que o único PATCH carrega o estado MESCLADO das duas
    // escritas, não só que "algo" foi chamado uma vez.
    expect(patchMock.mock.calls[0][0]).toMatchObject({
      completedSteps: { "criar-solicitacao": expect.any(String) },
      checklistDismissedAt: expect.any(String),
    });
  });

  /**
   * Burst com intervalo: é aqui que "reinicia a janela" se separa de "deduplica
   * envio". Sem o `clearTimeout`, o timer da primeira escrita dispara em t=500 e
   * manda um PATCH antes do segundo — e a asserção do meio falha.
   */
  it("reinicia a janela do debounce a cada escrita, não só deduplica", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("marcar"));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    await user.click(screen.getByText("dispensar"));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(patchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
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
    // Distingue "falha capturada e logada" de "rejeição solta no processo":
    // o setState otimista é síncrono e passaria de qualquer forma.
    expect(logger.error).toHaveBeenCalled();
  });

  /**
   * Reproduz o bug do "Refazer": marcar um passo agenda um PATCH em 500ms;
   * reiniciar logo em seguida precisa cancelar esse PATCH órfão, senão ele
   * dispara depois do reset e regrava o estado velho por cima.
   */
  it("cancela o PATCH pendente ao reiniciar, para não sobrescrever o reset do servidor", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("marcar"));
    await user.click(screen.getByText("reiniciar"));

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(patchMock).not.toHaveBeenCalled();
  });
});
