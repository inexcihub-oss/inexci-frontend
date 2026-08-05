import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import type { BillingBlockReason } from "@/lib/http-error";

/**
 * O aviso de bloqueio comercial precisa dizer coisas diferentes para quem
 * pode resolver e para quem não pode:
 *
 * - **dono da conta** → caminho de upgrade (aba de plano);
 * - **qualquer outro** (inclusive admin delegado) → orientação de procurar o
 *   administrador da conta, sem CTA — a aba de plano não existe para ele.
 */

let authState: {
  isAccountOwner: boolean;
  subscription: unknown;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { BillingLimitModal } from "../BillingLimitModal";

const CTA_PLANOS = "/configuracoes?tab=plan";

function renderModal(reason: BillingBlockReason, message = "Bloqueado.") {
  return render(
    <BillingLimitModal isOpen onClose={vi.fn()} block={{ reason, message }} />,
  );
}

const quotaSaturada = {
  quota: {
    used: 20,
    limit: 20,
    isUnlimited: false,
    remaining: 0,
    periodStart: "2026-07-10T12:00:00.000Z",
    periodEnd: "2026-08-10T12:00:00.000Z",
  },
};

describe("BillingLimitModal", () => {
  beforeEach(() => {
    authState = { isAccountOwner: false, subscription: null };
  });

  describe("dono da conta", () => {
    beforeEach(() => {
      authState = { isAccountOwner: true, subscription: quotaSaturada };
    });

    it("mostra o título de limite atingido e o CTA para a tela de planos", () => {
      renderModal("quota_exceeded");

      expect(
        screen.getByText("Limite de solicitações atingido"),
      ).toBeInTheDocument();
      const cta = screen.getByRole("link", {
        name: /ver planos e fazer upgrade/i,
      });
      expect(cta).toHaveAttribute("href", CTA_PLANOS);
    });

    it("não manda o dono contatar o administrador", () => {
      renderModal("quota_exceeded");

      expect(
        screen.queryByText(/administrador da conta/i),
      ).not.toBeInTheDocument();
    });

    it("exibe o consumo da cota e a data de renovação", () => {
      renderModal("quota_exceeded");

      expect(screen.getByText("20 de 20")).toBeInTheDocument();
      expect(screen.getByText("10/08/2026")).toBeInTheDocument();
      expect(
        screen.getByRole("progressbar", {
          name: /solicitações usadas no ciclo/i,
        }),
      ).toHaveAttribute("aria-valuenow", "20");
    });

    it.each([
      ["subscription_suspended", "Assinatura suspensa", /regularizar/i],
      ["subscription_canceled", "Assinatura cancelada", /ver planos/i],
      ["trial_expired", "Período de teste encerrado", /ver planos/i],
      [
        "payment_method_required",
        "Método de pagamento necessário",
        /cadastrar pagamento/i,
      ],
    ] as const)("cobre o reason %s", (reason, titulo, ctaLabel) => {
      renderModal(reason);

      expect(screen.getByText(titulo)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: ctaLabel })).toHaveAttribute(
        "href",
        CTA_PLANOS,
      );
    });

    it("usa a mensagem do backend quando o reason é desconhecido", () => {
      renderModal("unknown", "Motivo novo vindo do servidor.");

      expect(
        screen.getByText("Ação bloqueada pela assinatura"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Motivo novo vindo do servidor."),
      ).toBeInTheDocument();
    });

    it("esconde o bloco de cota quando o plano é ilimitado", () => {
      authState.subscription = {
        quota: { ...quotaSaturada.quota, isUnlimited: true, limit: -1 },
      };

      renderModal("quota_exceeded");

      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("não quebra quando a assinatura não está carregada", () => {
      authState.subscription = null;

      renderModal("quota_exceeded");

      expect(
        screen.getByText("Limite de solicitações atingido"),
      ).toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  describe("quem não é dono da conta", () => {
    it("orienta a contatar o administrador e não oferece CTA de upgrade", () => {
      renderModal("quota_exceeded");

      expect(
        screen.getByText(/peça ao administrador da conta/i),
      ).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it.each([
      "subscription_suspended",
      "subscription_canceled",
      "trial_expired",
      "payment_method_required",
      "unknown",
    ] as const)(
      "cita o administrador da conta também no reason %s",
      (reason) => {
        renderModal(reason);

        expect(
          screen.getByText(/administrador da conta/i),
        ).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
      },
    );

    it("exibe o consumo da cota — saber quando renova é útil para quem só pode esperar", () => {
      authState.subscription = quotaSaturada;

      renderModal("quota_exceeded");

      expect(screen.getByText("20 de 20")).toBeInTheDocument();
      expect(screen.getByText("10/08/2026")).toBeInTheDocument();
    });

    it("rotula o botão de dispensa como 'Entendi'", () => {
      renderModal("quota_exceeded");

      expect(
        screen.getByRole("button", { name: "Entendi" }),
      ).toBeInTheDocument();
    });
  });
});
