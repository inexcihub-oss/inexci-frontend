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
  const {
    state,
    tracks,
    completeStep,
    dismiss,
    restart,
    startTour,
    closeTour,
  } = useOnboarding();
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="trilhas">{tracks.map((t) => t.id).join(",")}</span>
      <span data-testid="dispensado">
        {String(Boolean(state.checklistDismissedAt))}
      </span>
      <span data-testid="passo-concluido">
        {String(Boolean(state.completedSteps["criar-solicitacao"]))}
      </span>
      <span data-testid="trilha-vista">
        {String(Boolean(state.toursSeen.solicitacoes))}
      </span>
      <button onClick={() => completeStep("criar-solicitacao")}>marcar</button>
      <button onClick={() => completeStep("assinatura-do-medico")}>
        marcar assinatura
      </button>
      <button onClick={dismiss}>dispensar</button>
      <button onClick={() => void restart()}>reiniciar</button>
      <button onClick={() => startTour("solicitacoes")}>iniciar tour</button>
      <button onClick={() => closeTour({ concluido: true })}>
        fechar concluido
      </button>
      <button onClick={() => closeTour()}>fechar sem concluir</button>
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

    // "completed", não "in_progress": o `authMock` padrão só libera
    // `Permission.SOLICITACOES`, então "solicitacoes" é a ÚNICA trilha
    // visível — marcar seu passo já completa todas as trilhas visíveis e
    // promove o status (achado 4 da revisão final).
    expect(screen.getByTestId("status")).toHaveTextContent("completed");
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

    // "completed": mesma razão do teste de otimismo acima — a única trilha
    // visível do `authMock` padrão é completada com um clique só.
    expect(screen.getByTestId("status")).toHaveTextContent("completed");
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

  /**
   * Achado 5 da revisão final: nenhum teste chamava `startTour`/`closeTour`
   * antes deste — a `Sonda` nem os expunha. `closeTour` é o ÚNICO caminho que
   * conclui uma trilha de verdade, e resolve a trilha por `activeTour`
   * (setado por `startTour`), carimbando `completedSteps[track.stepKey]` E
   * `toursSeen[track.id]`. Trocar `stepKey` por `id` (ou o inverso) em
   * qualquer um dos dois carimbos passaria pelo resto da suíte sem ser
   * detectado — por isso os dois `data-testid` abaixo leem chaves DIFERENTES
   * ("criar-solicitacao" vs. "solicitacoes").
   */
  describe("startTour / closeTour", () => {
    it("fechar com { concluido: true } carimba completedSteps[stepKey] e toursSeen[id] da trilha ativa", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("iniciar tour"));
      await user.click(screen.getByText("fechar concluido"));

      expect(screen.getByTestId("passo-concluido")).toHaveTextContent("true");
      expect(screen.getByTestId("trilha-vista")).toHaveTextContent("true");
    });

    it("fechar SEM { concluido: true } não marca completedSteps nem toursSeen", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("iniciar tour"));
      await user.click(screen.getByText("fechar sem concluir"));

      expect(screen.getByTestId("passo-concluido")).toHaveTextContent(
        "false",
      );
      expect(screen.getByTestId("trilha-vista")).toHaveTextContent("false");
    });

    it("fechar sem nunca ter iniciado um tour não quebra nem marca nada", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("fechar concluido"));

      expect(screen.getByTestId("passo-concluido")).toHaveTextContent(
        "false",
      );
      expect(screen.getByTestId("trilha-vista")).toHaveTextContent("false");
    });
  });

  /**
   * Achado 4 da revisão final: `status: "completed"` nunca era atribuído.
   * `authMock` só libera `Permission.SOLICITACOES` por padrão — mutar
   * `isDoctor` aqui adiciona a trilha `documentos-do-medico`, o mínimo para
   * provar "falta uma trilha" sem depender de outro arquivo de fixture.
   */
  describe("promoção para completed", () => {
    afterEach(() => {
      authMock.isDoctor = false;
    });

    it("promove quando a única trilha visível é concluída", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("marcar"));

      expect(screen.getByTestId("status")).toHaveTextContent("completed");
    });

    it("não promove enquanto falta trilha visível incompleta", async () => {
      authMock.isDoctor = true;
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      // Só marca "criar-solicitacao" — "assinatura-do-medico" continua faltando.
      await user.click(screen.getByText("marcar"));

      expect(screen.getByTestId("status")).toHaveTextContent("in_progress");
    });

    it("promove quando TODAS as trilhas visíveis são concluídas", async () => {
      authMock.isDoctor = true;
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("marcar"));
      await user.click(screen.getByText("marcar assinatura"));

      expect(screen.getByTestId("status")).toHaveTextContent("completed");
    });
  });

  /**
   * "Não flush no unmount": limpar o timer sem enviar o PATCH pendente perde
   * a escrita se o usuário fizer logout (que desmonta o provider) dentro da
   * janela de debounce — "Dispensar" some no clique, mas volta a aparecer no
   * próximo login porque o servidor nunca soube.
   */
  it("envia o PATCH pendente ao desmontar, em vez de só cancelar o timer", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("dispensar"));
    expect(patchMock).not.toHaveBeenCalled();

    unmount();

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock.mock.calls[0][0]).toMatchObject({
      checklistDismissedAt: expect.any(String),
    });
  });
});
