import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/services/patient.service", () => ({
  patientService: { create: vi.fn() },
}));

const onboardingMockState = vi.hoisted(() => ({ emTour: false }));
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: onboardingMockState.emTour }),
}));

import { patientService } from "@/services/patient.service";
import { CreatePatientModal } from "./CreatePatientModal";

/**
 * Este modal é alcançado pelo botão "Novo" (`data-tour="sc-wizard-novo-cadastro"`),
 * que o passo `cadastro-no-modal` da trilha de Solicitações destaca — o tour
 * chega até aqui sozinho, então o submit precisa ficar inerte durante ele.
 */
describe("CreatePatientModal — tour de onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onboardingMockState.emTour = false;
    (patientService.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pac-1",
      name: "Ana Beatriz Souza",
    });
  });

  const setup = () =>
    render(<CreatePatientModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

  const botao = () =>
    screen.getByRole("button", { name: /adicionar paciente/i });

  /** Nome + CPF válido são os dois campos exigidos por `createPatientQuickSchema`. */
  const preencher = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(
      screen.getByPlaceholderText("Nome do paciente"),
      "Ana Beatriz Souza",
    );
    await user.type(
      screen.getByPlaceholderText("123.456.789-00"),
      "52998224725",
    );
  };

  it("mantém o botão habilitado fora do tour e cria o paciente", async () => {
    const user = userEvent.setup();
    setup();
    await preencher(user);

    expect(botao()).toBeEnabled();
    await user.click(botao());
    await waitFor(() =>
      expect(patientService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ana Beatriz Souza" }),
      ),
    );
  });

  it("desabilita o botão durante o tour mesmo com o formulário preenchido", async () => {
    onboardingMockState.emTour = true;
    const user = userEvent.setup();
    setup();
    await preencher(user);

    expect(botao()).toBeDisabled();
    expect(patientService.create).not.toHaveBeenCalled();
  });
});
