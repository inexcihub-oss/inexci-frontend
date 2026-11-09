import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AxiosError, type AxiosResponse } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  deactivateAccount: vi.fn(),
  reactivateAccount: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AccountStatusModal } from "./AccountStatusModal";

function conflito(message: string) {
  return new AxiosError("x", "E", undefined, undefined, {
    status: 409,
    data: { message },
    statusText: "",
    headers: {},
    config: {},
  } as AxiosResponse);
}

const confirmar = (nome: string) => {
  const dialog = screen.getByRole("dialog");
  return screen
    .getAllByRole("button", { name: nome })
    .find((b) => dialog.contains(b))!;
};

beforeEach(() => vi.clearAllMocks());

describe("AccountStatusModal", () => {
  it("exige motivo antes de chamar a API", async () => {
    renderWithProviders(
      <AccountStatusModal
        isOpen
        onClose={vi.fn()}
        mode="deactivate"
        ownerId="o-1"
        accountName="Clínica Ortho"
      />,
    );

    fireEvent.click(confirmar("Desativar conta"));

    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(svc.deactivateAccount).not.toHaveBeenCalled();
  });

  it("conclui, avisa e fecha", async () => {
    svc.deactivateAccount.mockResolvedValue({
      auditLogId: "a",
      accountDeactivatedAt: "2026-10-28T12:00:00Z",
      revokedUsers: 2,
    });
    const onClose = vi.fn();
    renderWithProviders(
      <AccountStatusModal
        isOpen
        onClose={onClose}
        mode="deactivate"
        ownerId="o-1"
        accountName="Clínica Ortho"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "  Contrato encerrado  " },
    });
    fireEvent.click(confirmar("Desativar conta"));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(svc.deactivateAccount).toHaveBeenCalledWith("o-1", {
      reason: "Contrato encerrado",
    });
    expect(
      await screen.findByText(
        "Conta desativada. As sessões da clínica foram encerradas.",
      ),
    ).toBeInTheDocument();
  });

  it("409 da API aparece no modal e em toast", async () => {
    const mensagem =
      "A conta tem assinatura com cobrança na Stripe. Peça ao cliente para cancelar pelo portal de pagamento antes de desativar.";
    svc.deactivateAccount.mockRejectedValue(conflito(mensagem));
    renderWithProviders(
      <AccountStatusModal
        isOpen
        onClose={vi.fn()}
        mode="deactivate"
        ownerId="o-1"
        accountName="Clínica Ortho"
      />,
    );

    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Contrato encerrado" },
    });
    fireEvent.click(confirmar("Desativar conta"));

    await waitFor(() =>
      expect(screen.getAllByText(mensagem).length).toBeGreaterThanOrEqual(2),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(mensagem);
  });

  it("reativação explica a volta do acesso e chama a rota de reativar", async () => {
    svc.reactivateAccount.mockResolvedValue({
      auditLogId: "a",
      accountDeactivatedAt: null,
      revokedUsers: 0,
    });
    renderWithProviders(
      <AccountStatusModal
        isOpen
        onClose={vi.fn()}
        mode="reactivate"
        ownerId="o-1"
        accountName="Clínica Ortho"
        blockedReason="ignorado na reativação"
      />,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "volta a entrar normalmente",
    );
    expect(screen.queryByText("ignorado na reativação")).toBeNull();
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Cliente voltou" },
    });
    fireEvent.click(confirmar("Reativar conta"));

    await waitFor(() =>
      expect(svc.reactivateAccount).toHaveBeenCalledWith("o-1", {
        reason: "Cliente voltou",
      }),
    );
  });
});
