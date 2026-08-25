import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";
import { WelcomeModal } from "./WelcomeModal";

const markWelcome = vi.fn();
let viewerMock = {
  permissions: [Permission.SOLICITACOES],
  isDoctor: false,
  isAccountOwner: false,
};

vi.mock("./OnboardingProvider", () => ({
  useOnboarding: () => ({ markWelcome, viewer: viewerMock }),
}));

describe("WelcomeModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    viewerMock = {
      permissions: [Permission.SOLICITACOES],
      isDoctor: false,
      isAccountOwner: false,
    };
  });

  it("abre no primeiro slide", () => {
    render(<WelcomeModal onFinish={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByText("O que é a INEXCI")).toBeInTheDocument();
  });

  it("pular encerra e carimba welcomeSeenAt", async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<WelcomeModal onFinish={onFinish} onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(markWelcome).toHaveBeenCalledTimes(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("o terceiro slide fala da área do usuário", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={vi.fn()} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(screen.getByText(/montar a solicitação cirúrgica/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /mantenha sempre atualizada e assuma o controle da jornada do seu paciente/i,
      ),
    ).toBeInTheDocument();
  });

  it("médico vê a descrição de atendimento", async () => {
    viewerMock = {
      permissions: [Permission.ATENDIMENTO, Permission.AGENDA],
      isDoctor: true,
      isAccountOwner: false,
    };
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={vi.fn()} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(screen.getByText(/abrir a ficha do paciente/i)).toBeInTheDocument();
  });

  it("usuário sem área nenhuma ainda consegue concluir", async () => {
    viewerMock = { permissions: [], isDoctor: false, isAccountOwner: false };
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={onFinish} onSkip={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(
      screen.getByText(/assim que o administrador da conta liberar suas áreas/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /começar/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  /**
   * O foco precisa cair no DIÁLOGO, não no primeiro botão ("Pular por
   * agora"): senão um Enter no reflexo, ao abrir o modal, pula o onboarding
   * sem o usuário querer. `dialogo.contains(activeElement)` sozinho passaria
   * mesmo com o foco no botão — só `toBe(dialogo)` prova qual elemento
   * recebeu o foco de verdade.
   */
  it("é um diálogo com nome acessível e o foco cai no diálogo, não no botão de pular", async () => {
    render(<WelcomeModal onFinish={vi.fn()} onSkip={vi.fn()} />);

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("O que é a INEXCI");
    expect(document.activeElement).toBe(dialogo);
  });

  /**
   * Task 9, passo 3: `text-neutral-500` sobre branco fica só marginalmente
   * acima do limite AA (4.5:1) — sobe para `text-neutral-600` (~7.82:1) para
   * dar margem de segurança. Ver conta completa no relatório da task.
   */
  it("usa contraste AA no botão 'Pular por agora'", () => {
    render(<WelcomeModal onFinish={vi.fn()} onSkip={vi.fn()} />);

    const pular = screen.getByRole("button", { name: /pular por agora/i });
    expect(pular).toHaveClass("-ml-3");
    expect(pular).toHaveClass("text-neutral-600");
    expect(pular).not.toHaveClass("text-neutral-500");
  });
});
