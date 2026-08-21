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
    render(<WelcomeModal onFinish={vi.fn()} />);

    expect(screen.getByText("O que é a INEXCI")).toBeInTheDocument();
  });

  it("pular encerra e carimba welcomeSeenAt", async () => {
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={onFinish} />);

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(markWelcome).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("o terceiro slide fala da área do usuário", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(screen.getByText(/solicitações cirúrgicas/i)).toBeInTheDocument();
  });

  it("médico vê a descrição de atendimento", async () => {
    viewerMock = {
      permissions: [Permission.ATENDIMENTO, Permission.AGENDA],
      isDoctor: true,
      isAccountOwner: false,
    };
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(screen.getByText(/abre a ficha do paciente/i)).toBeInTheDocument();
  });

  it("usuário sem área nenhuma ainda consegue concluir", async () => {
    viewerMock = { permissions: [], isDoctor: false, isAccountOwner: false };
    const onFinish = vi.fn();
    const user = userEvent.setup();
    render(<WelcomeModal onFinish={onFinish} />);

    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await user.click(screen.getByRole("button", { name: /começar/i }));

    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
