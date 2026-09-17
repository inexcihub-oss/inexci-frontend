import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import DashboardLayoutInner from "./DashboardLayoutInner";

/**
 * Prova a ordem de aninhamento do layout PELO EFEITO, não lendo o JSX: com
 * consentimento pendente, o `ConsentGate` (real, não mockado aqui) devolve só
 * o próprio modal e nunca monta os filhos — logo o `OnboardingProvider` não
 * pode nem ser instanciado. Mover o provider para fora do `ConsentGate` faz
 * este teste falhar, porque o espião seria chamado de qualquer forma.
 */
const provedorMontado = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

let auth: {
  user: { id: string } | null;
  loading: boolean;
  isAccountOwner: boolean;
  subscription: { subscription: { status: string } } | null;
  consents: { requiredConsentsAccepted: boolean } | null;
  refreshConsents: () => Promise<void>;
} = {
  user: { id: "u1" },
  loading: false,
  isAccountOwner: false,
  subscription: { subscription: { status: "active" } },
  consents: { requiredConsentsAccepted: true },
  refreshConsents: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

vi.mock("@/contexts/NotificationsContext", () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/components/Sidebar", () => ({ default: () => null }));
vi.mock("@/components/BottomNavBar", () => ({ default: () => null }));
vi.mock("@/components/shared/MobileHeaderActions", () => ({
  default: () => null,
}));
vi.mock("@/components/billing/GlobalBanners", () => ({
  GlobalBanners: () => null,
}));
vi.mock("@/components/PermissionRouteGuard", () => ({
  PermissionRouteGuard: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// `ConsentGate` fica REAL de propósito — é ele quem decide se o provider é
// montado. Só o `OnboardingProvider` é mockado, para espionar a montagem sem
// precisar simular o `/auth/me`, o Redis nem o resto do provider real.
vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => {
    provedorMontado();
    return <>{children}</>;
  },
  useOnboarding: () => ({
    state: { welcomeSeenAt: null },
    tracks: [],
    // `viewer` precisa existir mesmo com `tracks: []`: depois do achado 3 da
    // revisão final, o `WelcomeModal` monta independente de haver trilha
    // visível (um colaborador sem área nenhuma também vê o modal) — e ele lê
    // `viewer.permissions` para montar o slide 3.
    viewer: { permissions: [], isDoctor: false, isAccountOwner: false },
    markWelcome: vi.fn(),
    activeTour: null,
    closeTour: vi.fn(),
  }),
}));

describe("DashboardLayoutInner — ordem ConsentGate > OnboardingProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth = {
      user: { id: "u1" },
      loading: false,
      isAccountOwner: false,
      subscription: { subscription: { status: "active" } },
      consents: { requiredConsentsAccepted: true },
      refreshConsents: vi.fn(),
    };
  });

  /**
   * A ordem é exigência legal, não estética: enquanto falta aceite, o
   * ConsentGate devolve só o próprio modal e o onboarding não pode nem existir
   * na árvore. Mover o provider para fora do ConsentGate faz este teste falhar.
   */
  it("não monta o onboarding enquanto o consentimento está pendente", () => {
    auth.consents = { requiredConsentsAccepted: false };
    render(
      <DashboardLayoutInner>
        <p>conteúdo</p>
      </DashboardLayoutInner>,
    );

    expect(provedorMontado).not.toHaveBeenCalled();
  });

  it("monta o onboarding depois do aceite", () => {
    auth.consents = { requiredConsentsAccepted: true };
    render(
      <DashboardLayoutInner>
        <p>conteúdo</p>
      </DashboardLayoutInner>,
    );

    expect(provedorMontado).toHaveBeenCalled();
  });
});

/**
 * `100vh` no celular mede a tela SEM a barra de endereço do navegador. Com a
 * barra visível, a raiz passava do fundo da tela: o fim do `main` ia parar
 * atrás do navegador e a barra inferior do app (fixa no fundo visível) cobria
 * o último trecho de conteúdo sem que ele pudesse ser rolado — os botões
 * "Criar solicitação" da revisão por documento ficavam inalcançáveis.
 *
 * O jsdom não calcula unidade de viewport; o que dá para garantir aqui é que a
 * raiz pede a altura dinâmica (`dvh`), que acompanha a barra do navegador.
 */
describe("DashboardLayoutInner — altura da raiz no mobile", () => {
  it("usa a altura dinâmica da viewport, não 100vh puro", () => {
    auth = { ...auth, consents: { requiredConsentsAccepted: true } };
    const { container } = render(
      <DashboardLayoutInner>
        <div />
      </DashboardLayoutInner>,
    );

    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz.className).toContain("supports-[height:100dvh]:h-dvh");
  });
});
