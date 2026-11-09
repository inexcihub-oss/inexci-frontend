import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({
  extendTrial: vi.fn(),
  grantInternalAccess: vi.fn(),
  revokeInternalAccess: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { ExtendTrialModal } from "./ExtendTrialModal";
import { GrantInternalAccessModal } from "./GrantInternalAccessModal";
import { RevokeInternalAccessModal } from "./RevokeInternalAccessModal";
import { ManageSubscriptionMenu } from "./ManageSubscriptionMenu";
import type { AdminAccountSubscription } from "@/services/admin.service";

const ok = { auditLogId: "a", status: "trialing" };

function backendError(status: number, message: string) {
  return new AxiosError("x", "E", undefined, undefined, {
    status,
    data: { message },
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  svc.extendTrial.mockResolvedValue(ok);
  svc.grantInternalAccess.mockResolvedValue(ok);
  svc.revokeInternalAccess.mockResolvedValue(ok);
});

describe("ExtendTrialModal", () => {
  const props = {
    isOpen: true,
    ownerId: "o-1",
    trialEndsAt: "2099-01-01T12:00:00Z",
    hasGatewaySubscription: true,
  };

  it("exige motivo e período antes de enviar", async () => {
    renderWithProviders(<ExtendTrialModal {...props} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(screen.getByText(/Escolha por quanto tempo/)).toBeInTheDocument();
    expect(svc.extendTrial).not.toHaveBeenCalled();
  });

  it("envia days e motivo, mostra o novo término e fecha", async () => {
    const onClose = vi.fn();
    renderWithProviders(<ExtendTrialModal {...props} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "+15 dias" }));
    expect(screen.getByTestId("novo-termino")).toHaveTextContent("16/01/2099");
    expect(screen.getByText(/feita na Stripe e no Inexci/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "  Cliente pediu mais tempo  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(svc.extendTrial).toHaveBeenCalledWith("o-1", {
        days: 15,
        reason: "Cliente pediu mais tempo",
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("sem assinatura na Stripe não mostra o aviso", () => {
    renderWithProviders(
      <ExtendTrialModal
        {...props}
        hasGatewaySubscription={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText(/feita na Stripe/)).toBeNull();
  });

  it("mostra o erro do backend e não fecha", async () => {
    svc.extendTrial.mockRejectedValue(backendError(502, "Stripe indisponível"));
    const onClose = vi.fn();
    renderWithProviders(<ExtendTrialModal {...props} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "+7 dias" }));
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "motivo válido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stripe indisponível",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("GrantInternalAccessModal", () => {
  it("valida o motivo e envia", async () => {
    const onClose = vi.fn();
    renderWithProviders(
      <GrantInternalAccessModal isOpen ownerId="o-1" onClose={onClose} />,
    );
    expect(screen.getByText(/sem limite e sem cobrança/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/Informe o motivo/)).toBeInTheDocument();
    expect(svc.grantInternalAccess).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Teste da equipe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(svc.grantInternalAccess).toHaveBeenCalledWith("o-1", {
        reason: "Teste da equipe",
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("mostra o 409 do backend dentro do modal", async () => {
    svc.grantInternalAccess.mockRejectedValue(
      backendError(
        409,
        "Conta com assinatura na Stripe não pode receber acesso interno",
      ),
    );
    renderWithProviders(
      <GrantInternalAccessModal isOpen ownerId="o-1" onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Teste da equipe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /409|Stripe não pode/,
    );
  });
});

describe("RevokeInternalAccessModal", () => {
  it("envia trial com 15 dias por padrão", async () => {
    renderWithProviders(
      <RevokeInternalAccessModal isOpen ownerId="o-1" onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Fim do teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(svc.revokeInternalAccess).toHaveBeenCalledWith("o-1", {
        to: "trial",
        trialDays: 15,
        reason: "Fim do teste",
      }),
    );
  });

  it("envia cancelamento sem trialDays", async () => {
    renderWithProviders(
      <RevokeInternalAccessModal isOpen ownerId="o-1" onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByLabelText("Cancelar"));
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Fim do teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(svc.revokeInternalAccess).toHaveBeenCalledWith("o-1", {
        to: "canceled",
        reason: "Fim do teste",
      }),
    );
  });

  it("recusa dias fora de 1 a 90", async () => {
    renderWithProviders(
      <RevokeInternalAccessModal isOpen ownerId="o-1" onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Dias de trial/), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: "Fim do teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(await screen.findByText(/1 a 90 dias/)).toBeInTheDocument();
    expect(svc.revokeInternalAccess).not.toHaveBeenCalled();
  });
});

describe("ManageSubscriptionMenu", () => {
  const base = {
    situation: "trial",
    trialEndsAt: "2099-01-01T12:00:00Z",
    canExtendTrial: true,
    trialExtensionBlockedReason: null,
    canGrantInternalAccess: true,
    internalAccessBlockedReason: null,
  } as AdminAccountSubscription;

  function open(sub: Partial<AdminAccountSubscription>) {
    renderWithProviders(
      <ManageSubscriptionMenu
        ownerId="o-1"
        subscription={{ ...base, ...sub }}
        hasGatewaySubscription={false}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Gerenciar assinatura/ }),
    );
  }

  it("em trial oferece estender e dar acesso interno", () => {
    open({});
    expect(
      screen.getByRole("menuitem", { name: /Estender trial/ }),
    ).toBeEnabled();
    expect(
      screen.getByRole("menuitem", { name: /Dar acesso interno/ }),
    ).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: /Encerrar/ })).toBeNull();
  });

  it("desabilita dar acesso interno com o motivo do backend", () => {
    open({
      canGrantInternalAccess: false,
      internalAccessBlockedReason: "Tem assinatura viva na Stripe",
    });
    const item = screen.getByRole("menuitem", { name: /Dar acesso interno/ });
    expect(item).toBeDisabled();
    expect(item).toHaveTextContent("Tem assinatura viva na Stripe");
  });

  it("desabilita estender quando canExtendTrial é falso", () => {
    open({ canExtendTrial: false, trialExtensionBlockedReason: "Sem trial" });
    expect(
      screen.getByRole("menuitem", { name: /Estender trial/ }),
    ).toBeDisabled();
  });

  it("na situação ativa não oferece estender", () => {
    open({ situation: "active" });
    expect(screen.queryByRole("menuitem", { name: /Estender/ })).toBeNull();
  });

  it("no acesso interno só oferece encerrar", () => {
    open({ situation: "internal" });
    expect(
      screen.getByRole("menuitem", { name: /Encerrar acesso interno/ }),
    ).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: /Dar acesso/ })).toBeNull();
  });

  it("abre o modal da ação escolhida", () => {
    open({});
    fireEvent.click(screen.getByRole("menuitem", { name: /Estender trial/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
