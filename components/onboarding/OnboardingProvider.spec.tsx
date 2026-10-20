import { useState } from "react";
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

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

const authMock: {
  user: { onboardingState: unknown };
  permissions: Permission[];
  isDoctor: boolean;
  isAccountOwner: boolean;
} = {
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
    activeTour,
    completeStep,
    completeAll,
    dismiss,
    restart,
    startTour,
    closeTour,
    isChecklistVisible,
    emTour,
    registrarAcao,
    desregistrarAcao,
    executarAcao,
  } = useOnboarding();
  const [executado, setExecutado] = useState(false);
  const [resultadoExecucao, setResultadoExecucao] = useState("");
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
      <span data-testid="checklist-visivel">
        {String(isChecklistVisible)}
      </span>
      <span data-testid="em-tour">{String(emTour)}</span>
      <span data-testid="trilha-ativa">{activeTour ?? ""}</span>
      <span data-testid="acao-executada">{String(executado)}</span>
      <span data-testid="resultado-execucao">{resultadoExecucao}</span>
      <button onClick={() => completeStep("criar-solicitacao")}>marcar</button>
      <button onClick={() => completeStep("assinatura-do-medico")}>
        marcar assinatura
      </button>
      <button onClick={() => completeStep("cadastros-basicos")}>
        marcar cadastros
      </button>
      <button onClick={() => completeStep("ver-dashboard")}>
        marcar dashboard
      </button>
      <button onClick={dismiss}>dispensar</button>
      <button onClick={completeAll}>concluir tudo</button>
      <button onClick={() => void restart()}>reiniciar</button>
      <button onClick={() => startTour("solicitacoes")}>iniciar tour</button>
      <button onClick={() => closeTour({ concluido: true })}>
        fechar concluido
      </button>
      <button onClick={() => closeTour()}>fechar sem concluir</button>
      <button
        onClick={() => registrarAcao("acao-teste", () => setExecutado(true))}
      >
        registrar ação
      </button>
      <button onClick={() => desregistrarAcao("acao-teste")}>
        desregistrar ação
      </button>
      <button
        onClick={() =>
          setResultadoExecucao(String(executarAcao("acao-teste")))
        }
      >
        executar ação
      </button>
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
    await user.click(screen.getByText("marcar dashboard"));
    await user.click(screen.getByText("marcar cadastros"));

    expect(screen.getByTestId("status")).toHaveTextContent("completed");
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("concluir tudo fecha todas as trilhas visíveis num único PATCH", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("concluir tudo"));
    expect(screen.getByTestId("status")).toHaveTextContent("completed");
    expect(screen.getByTestId("checklist-visivel")).toHaveTextContent("false");

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock.mock.calls[0][0]).toEqual({
      completedSteps: {
        "criar-solicitacao": expect.any(String),
        "ver-dashboard": expect.any(String),
        "cadastros-basicos": expect.any(String),
      },
      welcomeSeenAt: expect.any(String),
      status: "completed",
    });
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
    expect(patchMock.mock.calls[0][0]).toEqual({
      completedSteps: { "criar-solicitacao": expect.any(String) },
      status: "in_progress",
      checklistDismissedAt: expect.any(String),
    });
  });

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
    expect(logger.error).toHaveBeenCalled();
  });

  it("reinicia pelas boas-vindas após persistir o PATCH pendente", async () => {
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

    expect(screen.getByTestId("trilha-ativa")).toHaveTextContent("");
    expect(screen.getByTestId("em-tour")).toHaveTextContent("false");
    expect(patchMock).toHaveBeenCalledTimes(1);
  });

  it("espera o PATCH já em voo antes de enviar o reset", async () => {
    let concluirPatch: (() => void) | undefined;
    patchMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          concluirPatch = resolve;
        }),
    );
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
    expect(patchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText("reiniciar"));
    expect(resetMock).not.toHaveBeenCalled();

    await act(async () => {
      concluirPatch?.();
    });

    expect(resetMock).toHaveBeenCalledTimes(1);
  });

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

    it("concluir uma trilha avança sozinho para a próxima incompleta, sem fechar o tour", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("iniciar tour"));
      expect(screen.getByTestId("trilha-ativa")).toHaveTextContent(
        "solicitacoes",
      );

      await user.click(screen.getByText("fechar concluido"));

      expect(screen.getByTestId("trilha-ativa")).toHaveTextContent(
        "dashboard",
      );
      expect(screen.getByTestId("em-tour")).toHaveTextContent("true");
    });

    it("concluir a última trilha incompleta fecha o tour de vez", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("marcar dashboard"));
      await user.click(screen.getByText("marcar cadastros"));
      await user.click(screen.getByText("iniciar tour"));
      await user.click(screen.getByText("fechar concluido"));

      expect(screen.getByTestId("trilha-ativa")).toHaveTextContent("");
      expect(screen.getByTestId("em-tour")).toHaveTextContent("false");
    });

    it("fechar SEM concluir não avança para a próxima trilha", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("iniciar tour"));
      await user.click(screen.getByText("fechar sem concluir"));

      expect(screen.getByTestId("trilha-ativa")).toHaveTextContent("");
      expect(screen.getByTestId("em-tour")).toHaveTextContent("false");
    });
  });

  describe("promoção para completed", () => {
    afterEach(() => {
      authMock.isDoctor = false;
    });

    it("promove quando as três trilhas visíveis do authMock padrão são concluídas", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("marcar"));
      await user.click(screen.getByText("marcar dashboard"));
      await user.click(screen.getByText("marcar cadastros"));

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
      await user.click(screen.getByText("marcar dashboard"));
      await user.click(screen.getByText("marcar cadastros"));

      expect(screen.getByTestId("status")).toHaveTextContent("completed");
    });
  });

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
    expect(patchMock.mock.calls[0][0]).toEqual({
      checklistDismissedAt: expect.any(String),
    });
  });

  describe("PATCH incremental — só os campos tocados, nunca o snapshot inteiro", () => {
    afterEach(() => {
      authMock.isDoctor = false;
    });

    it("acumula só os campos tocados entre dois debounces, sem restartedAt nem o resto do estado", async () => {
      authMock.isDoctor = true;
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      await user.click(screen.getByText("marcar"));
      await user.click(screen.getByText("dispensar"));

      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(patchMock).toHaveBeenCalledTimes(1);
      expect(patchMock.mock.calls[0][0]).toEqual({
        completedSteps: { "criar-solicitacao": expect.any(String) },
        status: "in_progress",
        checklistDismissedAt: expect.any(String),
      });
    });
  });

  describe("isChecklistVisible", () => {
    it("some imediatamente ao concluir", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      expect(screen.getByTestId("checklist-visivel")).toHaveTextContent(
        "true",
      );

      await user.click(screen.getByText("marcar"));
      await user.click(screen.getByText("marcar dashboard"));
      await user.click(screen.getByText("marcar cadastros"));

      expect(screen.getByTestId("status")).toHaveTextContent("completed");
      expect(screen.getByTestId("checklist-visivel")).toHaveTextContent(
        "false",
      );
    });

    it("já chega completed do servidor (login seguinte): o card não renderiza", () => {
      const usuarioOriginal = authMock.user;
      authMock.user = {
        onboardingState: {
          status: "completed",
          completedSteps: { "criar-solicitacao": "2026-08-01T00:00:00.000Z" },
        },
      };

      render(
        <OnboardingProvider>
          <Sonda />
        </OnboardingProvider>,
      );

      expect(screen.getByTestId("status")).toHaveTextContent("completed");
      expect(screen.getByTestId("checklist-visivel")).toHaveTextContent(
        "false",
      );

      authMock.user = usuarioOriginal;
    });
  });

  it("emTour reflete se há um tour ativo", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    expect(screen.getByTestId("em-tour")).toHaveTextContent("false");
    await user.click(screen.getByText("iniciar tour"));
    expect(screen.getByTestId("em-tour")).toHaveTextContent("true");
    await user.click(screen.getByText("fechar sem concluir"));
    expect(screen.getByTestId("em-tour")).toHaveTextContent("false");
  });

  it("executarAcao roda a função registrada e devolve true", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("registrar ação"));
    await user.click(screen.getByText("executar ação"));

    expect(screen.getByTestId("acao-executada")).toHaveTextContent("true");
    expect(screen.getByTestId("resultado-execucao")).toHaveTextContent(
      "true",
    );
  });

  it("executarAcao devolve false quando nada foi registrado sob o id", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("executar ação"));

    expect(screen.getByTestId("resultado-execucao")).toHaveTextContent(
      "false",
    );
    expect(screen.getByTestId("acao-executada")).toHaveTextContent("false");
  });

  it("desregistrarAcao remove a ação — executarAcao volta a devolver false", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <OnboardingProvider>
        <Sonda />
      </OnboardingProvider>,
    );

    await user.click(screen.getByText("registrar ação"));
    await user.click(screen.getByText("desregistrar ação"));
    await user.click(screen.getByText("executar ação"));

    expect(screen.getByTestId("resultado-execucao")).toHaveTextContent(
      "false",
    );
  });
});
