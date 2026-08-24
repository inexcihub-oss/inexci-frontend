import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/procedure.service", () => ({
  procedureService: { create: vi.fn() },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { procedureService } from "@/services/procedure.service";
import { CreateProcedureModal } from "./CreateProcedureModal";

/**
 * Este modal é alcançado pelo botão "Novo" (`data-tour="sc-wizard-novo-cadastro"`),
 * que o passo `cadastro-no-modal` da trilha de Solicitações destaca — o tour
 * chega até aqui sozinho, então o submit precisa ficar inerte durante ele.
 */
describe("CreateProcedureModal — tour de onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    (procedureService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "proc-1",
      name: "Artroscopia de Joelho",
    });
  });

  const setup = () =>
    render(
      <CreateProcedureModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

  const botao = () =>
    screen.getByRole("button", { name: /adicionar procedimento/i });

  it("mantém o botão habilitado fora do tour e cria o procedimento", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByPlaceholderText("Ex. Artroscopia de Joelho"),
      "Artroscopia de Joelho",
    );

    expect(botao()).toBeEnabled();
    await user.click(botao());
    await waitFor(() =>
      expect(procedureService.create).toHaveBeenCalledWith({
        name: "Artroscopia de Joelho",
      }),
    );
  });

  it("desabilita o botão durante o tour mesmo com o formulário preenchido", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByPlaceholderText("Ex. Artroscopia de Joelho"),
      "Artroscopia de Joelho",
    );

    expect(botao()).toBeDisabled();
    expect(procedureService.create).not.toHaveBeenCalled();
  });
});
