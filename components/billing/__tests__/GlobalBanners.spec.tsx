import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import type { SubscriptionDetail } from "@/types";

/**
 * Um banner por vez. Banners empilhados comeriam metade da tela no mobile, e
 * a precedência é assinatura → cota → onboarding: oferecer upgrade de plano a
 * quem está inadimplente é conversa fora de hora, e convidar para um tour
 * quem está estourando a cota, também.
 */

let authState: {
  isAccountOwner: boolean;
  accountId: string | null;
  subscription: SubscriptionDetail | null;
  subscriptionLoading: boolean;
};

/**
 * Espelha o contrato real do `QuotaBanner`: quando tem aviso de cota a
 * mostrar, ignora o `fallback` recebido; quando não tem, cede a vez a ele. É
 * assim que o onboarding aparece só quando a cota está silenciosa.
 */
let mostrarAvisoDeCota = true;

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../QuotaBanner", () => ({
  QuotaBanner: ({ fallback }: { fallback?: ReactNode }) =>
    mostrarAvisoDeCota ? <div data-testid="quota-banner" /> : <>{fallback}</>,
}));

vi.mock("../BillingStatusBanner", () => ({
  BillingStatusBanner: ({ variant }: { variant: { title: string } }) => (
    <div data-testid="billing-banner">{variant.title}</div>
  ),
}));

vi.mock("@/components/onboarding/OnboardingBanner", () => ({
  OnboardingBanner: () => <div data-testid="onboarding-banner" />,
}));

import { GlobalBanners } from "../GlobalBanners";

function assinatura(
  overrides: Partial<SubscriptionDetail["subscription"]> = {},
): SubscriptionDetail {
  return {
    subscription: {
      id: "sub-1",
      status: "active",
      planId: "plan-1",
      trialEndsAt: null,
      currentPeriodStart: "2026-08-01T00:00:00.000Z",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      suspendedAt: null,
      pastDueSince: null,
      gatewayProvider: "stripe",
      ...overrides,
    },
    plan: null,
    nextPlan: null,
    quota: null,
    daysLeftInTrial: null,
    daysUntilSuspension: null,
  } as SubscriptionDetail;
}

beforeEach(() => {
  authState = {
    isAccountOwner: true,
    accountId: "acc-1",
    subscription: assinatura(),
    subscriptionLoading: false,
  };
  mostrarAvisoDeCota = true;
});

describe("GlobalBanners", () => {
  it("mostra o de cota quando a assinatura está saudável", () => {
    render(<GlobalBanners />);
    expect(screen.getByTestId("quota-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("billing-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-banner")).not.toBeInTheDocument();
  });

  it("dá precedência ao problema de assinatura sobre a cota", () => {
    authState.subscription = assinatura({ status: "past_due" });
    render(<GlobalBanners />);

    expect(screen.getByTestId("billing-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("quota-banner")).not.toBeInTheDocument();
  });

  it("nunca empilha os dois", () => {
    authState.subscription = assinatura({ status: "suspended" });
    render(<GlobalBanners />);
    expect(screen.getAllByTestId(/banner/)).toHaveLength(1);
  });

  it("não mostra o banner de assinatura a quem não é dono da conta", () => {
    authState.isAccountOwner = false;
    authState.subscription = assinatura({ status: "past_due" });
    render(<GlobalBanners />);

    expect(screen.queryByTestId("billing-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("quota-banner")).toBeInTheDocument();
  });

  it("segura os demais banners enquanto a assinatura do dono ainda está carregando", () => {
    authState.subscription = null;
    authState.subscriptionLoading = true;
    const { container } = render(<GlobalBanners />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não segura o de cota de quem não é dono (esse nunca carrega assinatura)", () => {
    authState.isAccountOwner = false;
    authState.subscription = null;
    authState.subscriptionLoading = true;
    render(<GlobalBanners />);
    expect(screen.getByTestId("quota-banner")).toBeInTheDocument();
  });

  /**
   * Onboarding é a menor precedência das três: só aparece quando a cota não
   * tem nada a dizer. Sem este teste, o `fallback` do `QuotaBanner` poderia
   * parar de ser passado e o onboarding nunca mais apareceria em lugar
   * nenhum, silenciosamente.
   */
  it("mostra o de onboarding quando não há aviso de cota nem problema de assinatura", () => {
    mostrarAvisoDeCota = false;
    render(<GlobalBanners />);

    expect(screen.getByTestId("onboarding-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("quota-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("billing-banner")).not.toBeInTheDocument();
  });

  it("dá precedência à cota sobre o onboarding", () => {
    mostrarAvisoDeCota = true;
    render(<GlobalBanners />);

    expect(screen.getByTestId("quota-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-banner")).not.toBeInTheDocument();
  });

  it("dá precedência ao problema de assinatura sobre o onboarding", () => {
    mostrarAvisoDeCota = false;
    authState.subscription = assinatura({ status: "past_due" });
    render(<GlobalBanners />);

    expect(screen.getByTestId("billing-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("onboarding-banner")).not.toBeInTheDocument();
  });
});
