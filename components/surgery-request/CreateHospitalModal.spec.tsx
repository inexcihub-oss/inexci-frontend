import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/hospital.service", () => ({
  hospitalService: { create: vi.fn() },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { hospitalService } from "@/services/hospital.service";
import { CreateHospitalModal } from "./CreateHospitalModal";

/**
 * Este modal é alcançado pelo botão "Novo" (`data-tour="sc-wizard-novo-cadastro"`),
 * que o passo `cadastro-no-modal` da trilha de Solicitações destaca — o tour
 * chega até aqui sozinho, então o submit precisa ficar inerte durante ele.
 */
describe("CreateHospitalModal — tour de onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    (hospitalService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "hosp-1",
      name: "Hospital Central",
    });
  });

  const setup = () =>
    render(<CreateHospitalModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

  const botao = () => screen.getByRole("button", { name: /adicionar hospital/i });

  it("mantém o botão habilitado fora do tour e cria o hospital", async () => {
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByPlaceholderText("Nome do hospital"),
      "Hospital Central",
    );

    expect(botao()).toBeEnabled();
    await user.click(botao());
    await waitFor(() =>
      expect(hospitalService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Hospital Central" }),
      ),
    );
  });

  it("desabilita o botão durante o tour mesmo com o formulário preenchido", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup();

    await user.type(
      screen.getByPlaceholderText("Nome do hospital"),
      "Hospital Central",
    );

    expect(botao()).toBeDisabled();
    expect(hospitalService.create).not.toHaveBeenCalled();
  });
});
