import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils/render-with-providers";
import { Permission } from "@/lib/permissions";

const authState = vi.hoisted(() => ({
  permissoes: [] as string[],
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: (p: string) => authState.permissoes.includes(p),
  }),
}));

vi.mock("@/services/finance.service", () => ({
  financeService: {
    closeCurrentCashSession: vi.fn(),
    closeCashSession: vi.fn(),
  },
}));

import { financeService } from "@/services/finance.service";
import {
  CloseCashSessionModal,
  diferencaEmCentavos,
} from "./CloseCashSessionModal";

const svc = vi.mocked(financeService);

const sessao = {
  id: "cs-1",
  cashBalance: "350.10",
  user: { id: "u-2", name: "Joana" },
  account: { id: "acc-caixa", name: "Caixa Físico" },
};

async function contar(digitos: string) {
  const campo = screen.getByLabelText(/Valor contado/);
  await userEvent.clear(campo);
  await userEvent.type(campo, digitos);
}

describe("diferencaEmCentavos", () => {
  it("calcula em centavos inteiros", () => {
    expect(diferencaEmCentavos("R$ 0,30", "0.10")).toBe(20);
    expect(diferencaEmCentavos("R$ 350,00", "350.10")).toBe(-10);
    expect(diferencaEmCentavos("", "1.00")).toBeNull();
  });
});

describe("CloseCashSessionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    svc.closeCurrentCashSession.mockResolvedValue({} as never);
    svc.closeCashSession.mockResolvedValue({} as never);
    authState.permissoes = [Permission.FINANCEIRO];
  });

  it("destaca falta, sobra e sem diferença conforme o valor contado", async () => {
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );

    expect(screen.getByTestId("valor-esperado")).toHaveTextContent("R$ 350,10");
    expect(screen.queryByTestId("diferenca-caixa")).not.toBeInTheDocument();

    await contar("35000");
    expect(screen.getByTestId("diferenca-caixa")).toHaveTextContent(
      /Falta\s*R\$\s0,10/,
    );
    await contar("35100");
    expect(screen.getByTestId("diferenca-caixa")).toHaveTextContent(
      /Sobra\s*R\$\s0,90/,
    );
    await contar("35010");
    expect(screen.getByTestId("diferenca-caixa")).toHaveTextContent(
      "Sem diferença",
    );
  });

  it("fecha o caixa atual com o valor contado e a observação", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={onClose} session={sessao} />,
    );
    await contar("35000");
    await userEvent.type(screen.getByLabelText("Observação"), "Faltou troco");
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));

    await waitFor(() =>
      expect(svc.closeCurrentCashSession).toHaveBeenCalledWith({
        countedAmount: "350.00",
        notes: "Faltou troco",
      }),
    );
    expect(svc.closeCashSession).not.toHaveBeenCalled();
    expect(await screen.findByText("Caixa fechado.")).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it("caixa de outro usuário fecha pela rota do id", async () => {
    renderWithProviders(
      <CloseCashSessionModal
        isOpen
        ofOtherUser
        onClose={vi.fn()}
        session={sessao}
      />,
    );
    expect(screen.getByText(/aberto por Joana/)).toBeInTheDocument();
    await contar("35000");
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));

    await waitFor(() =>
      expect(svc.closeCashSession).toHaveBeenCalledWith("cs-1", {
        countedAmount: "350.00",
        notes: undefined,
      }),
    );
  });

  it("não fecha sem o valor contado", async () => {
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    expect(
      await screen.findByText("Informe o valor contado."),
    ).toBeInTheDocument();
    expect(svc.closeCurrentCashSession).not.toHaveBeenCalled();
  });

  it("até R$ 50,00 de diferença a justificativa é opcional", async () => {
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );
    await contar("30010");
    expect(screen.getByLabelText("Observação")).not.toBeRequired();
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));

    await waitFor(() =>
      expect(svc.closeCurrentCashSession).toHaveBeenCalledWith({
        countedAmount: "300.10",
        notes: undefined,
      }),
    );
  });

  it("acima de R$ 50,00 de diferença exige justificativa", async () => {
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );
    await contar("30000");
    const justificativa = screen.getByLabelText(/Justificativa/);
    expect(justificativa).toBeRequired();
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));

    expect(
      await screen.findByText(
        "Diferença acima de R$ 50,00: explique o motivo na justificativa.",
      ),
    ).toBeInTheDocument();
    expect(svc.closeCurrentCashSession).not.toHaveBeenCalled();

    await userEvent.type(justificativa, "Troco dado a mais");
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    await waitFor(() =>
      expect(svc.closeCurrentCashSession).toHaveBeenCalledWith({
        countedAmount: "300.00",
        notes: "Troco dado a mais",
      }),
    );
  });

  it("acima de R$ 1.000,00 sem a área Administração bloqueia o fechamento", async () => {
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );
    await contar("200000");

    expect(
      screen.getByTestId("aviso-diferenca-administracao"),
    ).toHaveTextContent(/só quem tem a área Administração/);
    expect(screen.getByRole("button", { name: "Fechar caixa" })).toBeDisabled();
    expect(svc.closeCurrentCashSession).not.toHaveBeenCalled();
  });

  it("acima de R$ 1.000,00 com a área Administração fecha com justificativa", async () => {
    authState.permissoes = [Permission.FINANCEIRO, Permission.ADMINISTRACAO];
    renderWithProviders(
      <CloseCashSessionModal isOpen onClose={vi.fn()} session={sessao} />,
    );
    await contar("200000");

    expect(
      screen.getByTestId("aviso-diferenca-administracao"),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText(/Justificativa/),
      "Depósito não lançado",
    );
    await userEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    await waitFor(() =>
      expect(svc.closeCurrentCashSession).toHaveBeenCalledWith({
        countedAmount: "2000.00",
        notes: "Depósito não lançado",
      }),
    );
  });
});
