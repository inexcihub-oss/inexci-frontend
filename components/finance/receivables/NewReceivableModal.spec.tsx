import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    createReceivable: vi.fn(),
    listProfessionals: vi.fn(),
  },
}));
vi.mock("@/services/patient.service", () => ({
  patientService: { list: vi.fn() },
}));

import { financeService } from "@/services/finance.service";
import { NewReceivableModal } from "./NewReceivableModal";

const createReceivable = vi.mocked(financeService.createReceivable);
const listProfessionals = vi.mocked(financeService.listProfessionals);

describe("NewReceivableModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createReceivable.mockResolvedValue({ id: "r-9" } as never);
    listProfessionals.mockResolvedValue([
      { id: "d-1", name: "Fabio Segall", council: "CRM", registry: "1" },
      { id: "n-1", name: "Laura Nutri", council: "CRN", registry: null },
    ]);
  });

  it("cria cobrança avulsa com itens e profissional executante", async () => {
    const onCreated = vi.fn();
    renderWithProviders(
      <NewReceivableModal
        isOpen
        onClose={vi.fn()}
        onCreated={onCreated}
        defaultPatient={{ id: "p-1", name: "Ana Beatriz" }}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Descrição/), "Consulta");
    await screen.findByRole("option", { name: "Fabio Segall" });
    expect(
      screen.getByRole("option", { name: "Laura Nutri" }),
    ).toBeInTheDocument();
    expect(listProfessionals).toHaveBeenCalled();
    await userEvent.selectOptions(
      screen.getByLabelText("Profissional executante"),
      "d-1",
    );
    await userEvent.type(screen.getByLabelText(/^Valor/), "35000");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }));
    await userEvent.type(screen.getAllByLabelText(/Descrição/)[1], "Curativo");
    await userEvent.type(screen.getAllByLabelText(/^Valor/)[1], "5050");
    expect(screen.getByText(/Total R\$\s400,50/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Criar cobrança" }));

    await waitFor(() =>
      expect(createReceivable).toHaveBeenCalledWith({
        patientId: "p-1",
        items: [
          { description: "Consulta", unitAmount: "350.00", executedById: "d-1" },
          { description: "Curativo", unitAmount: "50.50" },
        ],
      }),
    );
    expect(await screen.findByText("Cobrança criada.")).toBeInTheDocument();
    expect(onCreated).toHaveBeenCalledWith({ id: "r-9" });
  });

  it("não cria sem paciente nem valor", async () => {
    renderWithProviders(<NewReceivableModal isOpen onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Criar cobrança" }));

    expect(await screen.findByText("Selecione o paciente.")).toBeInTheDocument();
    expect(screen.getByText("Informe o valor.")).toBeInTheDocument();
    expect(createReceivable).not.toHaveBeenCalled();
  });
});
