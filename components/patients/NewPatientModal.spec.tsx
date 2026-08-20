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
