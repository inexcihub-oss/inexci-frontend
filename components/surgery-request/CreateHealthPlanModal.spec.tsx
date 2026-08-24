import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: { create: vi.fn() },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { healthPlanService } from "@/services/health-plan.service";
import { CreateHealthPlanModal } from "./CreateHealthPlanModal";

/**
 * Este modal é alcançado pelo botão "Novo" (`data-tour="sc-wizard-novo-cadastro"`),
 * que o passo `cadastro-no-modal` da trilha de Solicitações destaca — o tour
 * chega até aqui sozinho, então o submit precisa ficar inerte durante ele.
 */
describe("CreateHealthPlanModal — tour de onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    (healthPlanService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "hp-1",
      name: "Unimed",
    });
  });

  const setup = () =>
    render(
      <CreateHealthPlanModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

  const botao = () => screen.getByRole("button", { name: /adicionar convênio/i });

  it("mantém o botão habilitado fora do tour e cria o convênio", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText("Nome do convênio"), "Unimed");

    expect(botao()).toBeEnabled();
    await user.click(botao());
    await waitFor(() =>
      expect(healthPlanService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Unimed" }),
      ),
    );
  });

  it("desabilita o botão durante o tour mesmo com o formulário preenchido", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByPlaceholderText("Nome do convênio"), "Unimed");

    expect(botao()).toBeDisabled();
    expect(healthPlanService.create).not.toHaveBeenCalled();
  });
});
