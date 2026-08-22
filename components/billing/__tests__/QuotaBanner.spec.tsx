import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { QuotaStatus } from "@/types";

/**
 * O banner de cota vive no topo de toda página do dashboard. O que ele precisa
 * garantir:
 *
 * - o **número absoluto** no título (é sobre ele que o usuário age);
 * - CTA de upgrade só para o dono da conta;
 * - dispensa que sobrevive à navegação, mas volta no degrau seguinte;
 * - o degrau crítico **não** pode ser dispensado.
 */

let authState: {
  isAccountOwner: boolean;
  accountId: string | null;
};

let quotaState: QuotaStatus | null;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useQuota", () => ({
  useQuota: () => ({ data: quotaState }),
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

import { QuotaBanner } from "../QuotaBanner";
import { quotaDismissKey } from "@/lib/quota-banner";

const PERIODO_FIM = "2026-09-01T00:00:00.000Z";

function comConsumo(used: number, limit = 20): QuotaStatus {
  return {
    used,
    limit,
    isUnlimited: false,
    remaining: Math.max(0, limit - used),
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: PERIODO_FIM,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  authState = { isAccountOwner: true, accountId: "acc-1" };
  quotaState = null;
});

describe("QuotaBanner", () => {
  it("não renderiza nada abaixo de 75%", () => {
    quotaState = comConsumo(14);
    const { container } = render(<QuotaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada sem cota carregada", () => {
    const { container } = render(<QuotaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("anuncia o restante em número absoluto, com o consumo ao lado da barra", () => {
    quotaState = comConsumo(17);
    render(<QuotaBanner />);

    expect(
      screen.getByText("Faltam 3 de 20 solicitações neste ciclo"),
    ).toBeInTheDocument();
    expect(screen.getByText("17/20")).toBeInTheDocument();
  });

  it("é anunciado por leitor de tela sem roubar o foco", () => {
    quotaState = comConsumo(17);
    render(<QuotaBanner />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("oferece o upgrade ao dono da conta", () => {
    quotaState = comConsumo(17);
    render(<QuotaBanner />);

    expect(
      screen.getByRole("link", { name: /fazer upgrade/i }),
    ).toHaveAttribute("href", "/configuracoes?tab=plan");
  });

  it("não oferece link de plano a quem não é dono da conta", () => {
    authState = { isAccountOwner: false, accountId: "acc-1" };
    quotaState = comConsumo(17);
    render(<QuotaBanner />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      screen.getByText(/fale com o administrador da conta/i),
    ).toBeInTheDocument();
  });

  it("some ao ser dispensado e grava a escolha por ciclo", async () => {
    const user = userEvent.setup();
    quotaState = comConsumo(17);
    render(<QuotaBanner />);

    await user.click(
      screen.getByRole("button", { name: /dispensar aviso de cota/i }),
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem(
        quotaDismissKey("acc-1", PERIODO_FIM, "medium"),
      ),
    ).toBe("1");
  });

  it("continua dispensado ao remontar dentro do mesmo ciclo", () => {
    window.localStorage.setItem(
      quotaDismissKey("acc-1", PERIODO_FIM, "medium"),
      "1",
    );
    quotaState = comConsumo(17);

    const { container } = render(<QuotaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("reaparece no degrau seguinte mesmo com o anterior dispensado", () => {
    window.localStorage.setItem(
      quotaDismissKey("acc-1", PERIODO_FIM, "medium"),
      "1",
    );
    quotaState = comConsumo(18);

    render(<QuotaBanner />);
    expect(
      screen.getByText("Faltam 2 de 20 solicitações neste ciclo"),
    ).toBeInTheDocument();
  });

  it("volta quando o ciclo vira, porque a chave de dispensa muda", () => {
    window.localStorage.setItem(
      quotaDismissKey("acc-1", PERIODO_FIM, "medium"),
      "1",
    );
    quotaState = { ...comConsumo(17), periodEnd: "2026-10-01T00:00:00.000Z" };

    render(<QuotaBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("não deixa dispensar o aviso de limite atingido", () => {
    quotaState = comConsumo(20);
    render(<QuotaBanner />);

    expect(
      screen.getByText("Você atingiu o limite de 20 solicitações do plano"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /dispensar aviso de cota/i }),
    ).not.toBeInTheDocument();
  });

  it("ignora dispensa gravada para o degrau crítico", () => {
    window.localStorage.setItem(
      quotaDismissKey("acc-1", PERIODO_FIM, "critical"),
      "1",
    );
    quotaState = comConsumo(20);

    render(<QuotaBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("não renderiza nada quando o plano é ilimitado", () => {
    quotaState = {
      ...comConsumo(999, 20),
      isUnlimited: true,
      remaining: null,
    };
    const { container } = render(<QuotaBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * `fallback` é o mecanismo de precedência do `GlobalBanners`: quando não há
   * aviso de cota, o `QuotaBanner` cede o lugar em vez de simplesmente sumir.
   */
  it("mostra o fallback quando não há aviso de cota a exibir", () => {
    quotaState = comConsumo(14);
    render(<QuotaBanner fallback={<div data-testid="fallback" />} />);

    expect(screen.getByTestId("fallback")).toBeInTheDocument();
  });

  it("ignora o fallback quando há aviso de cota a exibir", () => {
    quotaState = comConsumo(17);
    render(<QuotaBanner fallback={<div data-testid="fallback" />} />);

    expect(screen.queryByTestId("fallback")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
