import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { FinancialAccountType } from "@/types/finance.types";

vi.mock("@/services/finance.service", () => ({
  financeService: {
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
  },
}));

import { financeService } from "@/services/finance.service";
import { FinancialAccountModal } from "./FinancialAccountModal";

const createAccount = financeService.createAccount as ReturnType<typeof vi.fn>;
const updateAccount = financeService.updateAccount as ReturnType<typeof vi.fn>;

const conta = {
  id: "acc-1",
  name: "Stone crédito",
  type: FinancialAccountType.CARD_CREDIT,
  active: true,
  notes: "Maquininha da recepção",
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("FinancialAccountModal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cria a conta com nome, tipo e observação e avisa por toast", async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    createAccount.mockResolvedValue({ ...conta, id: "acc-2", name: "Cora" });

    renderWithProviders(
      <FinancialAccountModal isOpen onClose={onClose} onSaved={onSaved} />,
    );

    expect(screen.getByText("Nova conta")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Nome/), "Cora");
    await userEvent.selectOptions(
      screen.getByLabelText("Tipo"),
      FinancialAccountType.BANK,
    );
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(createAccount).toHaveBeenCalledWith({
        name: "Cora",
        type: "bank",
        notes: undefined,
      }),
    );
    expect(await screen.findByText("Conta criada.")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("não envia sem nome", async () => {
    renderWithProviders(<FinancialAccountModal isOpen onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Informe o nome da conta."),
    ).toBeInTheDocument();
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("edita a conta existente já preenchida", async () => {
    updateAccount.mockResolvedValue({ ...conta, name: "Stone" });

    renderWithProviders(
      <FinancialAccountModal isOpen onClose={vi.fn()} account={conta} />,
    );

    expect(screen.getByText("Editar conta")).toBeInTheDocument();
    const nome = screen.getByLabelText(/Nome/);
    expect(nome).toHaveValue("Stone crédito");
    await userEvent.clear(nome);
    await userEvent.type(nome, "Stone");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(updateAccount).toHaveBeenCalledWith("acc-1", {
        name: "Stone",
        type: "card_credit",
        notes: "Maquininha da recepção",
      }),
    );
    expect(await screen.findByText("Conta atualizada.")).toBeInTheDocument();
  });

  it("mostra o erro da API em toast e mantém o modal aberto", async () => {
    const onClose = vi.fn();
    createAccount.mockRejectedValue(new Error("Já existe uma conta com esse nome."));

    renderWithProviders(<FinancialAccountModal isOpen onClose={onClose} />);

    await userEvent.type(screen.getByLabelText(/Nome/), "Cora");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      await screen.findByText("Já existe uma conta com esse nome."),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
