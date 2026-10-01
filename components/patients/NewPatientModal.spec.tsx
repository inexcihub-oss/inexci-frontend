import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Permission } from "@/lib/permissions";

vi.mock("@/services/patient.service", () => ({
  patientService: { create: vi.fn() },
}));

vi.mock("@/services/health-plan.service", () => ({
  healthPlanService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  },
}));

const permissions: Permission[] = [Permission.ATENDIMENTO];
// CreateHealthPlanModal (aberto pelo atalho de convênio) lê o estado do tour.
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    permissions,
    can: (p: Permission) => permissions.includes(p),
  }),
}));

import { patientService } from "@/services/patient.service";
import { healthPlanService } from "@/services/health-plan.service";
import { NewPatientModal } from "./NewPatientModal";

function renderModal() {
  return render(
    <NewPatientModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />,
  );
}

/** Abre o combobox de convênio e escolhe "Cadastrar novo convênio". */
async function abrirModalDeConvenio(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /convênio/i }));
  await user.click(
    await screen.findByRole("button", { name: /cadastrar novo convênio/i }),
  );
  await screen.findByPlaceholderText("Nome do convênio");
}

describe("NewPatientModal + cadastro de convênio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
  });

  it("não renderiza o formulário do convênio dentro do formulário do paciente", async () => {
    const user = userEvent.setup();
    renderModal();
    await abrirModalDeConvenio(user);

    // `<form>` dentro de `<form>` é HTML inválido: o Chrome não propaga o
    // submit do form interno para além do externo, então o `onSubmit` do
    // React (delegado no root) nunca roda — sem `preventDefault`, o browser
    // faz o submit nativo e a página recarrega.
    expect(document.querySelectorAll("form form")).toHaveLength(0);
  });

  it("cria o convênio sem submeter o formulário de paciente", async () => {
    const user = userEvent.setup();
    vi.mocked(healthPlanService.create).mockResolvedValue({
      id: "hp-1",
      name: "Unimed QA",
    } as never);

    renderModal();
    await abrirModalDeConvenio(user);

    await user.type(
      screen.getByPlaceholderText("Nome do convênio"),
      "Unimed QA",
    );
    await user.click(
      screen.getByRole("button", { name: /adicionar convênio/i }),
    );

    await waitFor(() =>
      expect(healthPlanService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Unimed QA" }),
      ),
    );
    expect(patientService.create).not.toHaveBeenCalled();
    // O submit do convênio não pode escapar para o form do paciente: se
    // escapasse, a validação do paciente rodaria e reclamaria dos campos.
    expect(screen.queryByText(/Corrija os campos/i)).not.toBeInTheDocument();
  });
});

describe("NewPatientModal — CPF opcional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(healthPlanService.getAll).mockResolvedValue([]);
    vi.mocked(patientService.create).mockResolvedValue({
      id: "p-1",
      name: "Ana Souza",
    } as never);
  });

  it("cria o paciente sem CPF, sem mandar o campo", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.click(
      screen.getByRole("button", { name: /adicionar paciente/i }),
    );

    await waitFor(() => expect(patientService.create).toHaveBeenCalled());
    expect(vi.mocked(patientService.create).mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: "Ana Souza", cpf: undefined }),
    );
  });

  it("continua validando o CPF quando ele é informado", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("Nome completo"), "Ana Souza");
    await user.type(screen.getByPlaceholderText("123.456.789-00"), "1234");
    await user.click(
      screen.getByRole("button", { name: /adicionar paciente/i }),
    );

    // A mensagem aparece no campo e no resumo do toast.
    expect(
      (await screen.findAllByText(/CPF deve ter 11 dígitos/i)).length,
    ).toBeGreaterThan(0);
    expect(patientService.create).not.toHaveBeenCalled();
  });

  it("não marca o CPF como obrigatório", () => {
    renderModal();

    expect(screen.getByPlaceholderText("123.456.789-00")).not.toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByText("CPF (opcional)")).toBeInTheDocument();
  });
});
