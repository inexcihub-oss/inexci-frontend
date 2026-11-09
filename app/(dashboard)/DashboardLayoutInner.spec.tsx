import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import DashboardLayoutInner from "./DashboardLayoutInner";

const provedorMontado = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

let auth: {
  user: { id: string } | null;
  loading: boolean;
  isAccountOwner: boolean;
  isAdmin?: boolean;
  subscriptionChecked?: boolean;
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

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => {
    provedorMontado();
    return <>{children}</>;
  },
  useOnboarding: () => ({
    state: { welcomeSeenAt: null },
    tracks: [],
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

describe("DashboardLayoutInner — dono sem assinatura", () => {
  beforeEach(() => {
    replace.mockClear();
    auth = {
      user: { id: "u1" },
      loading: false,
      isAccountOwner: true,
      isAdmin: true,
      subscriptionChecked: true,
      subscription: null,
      consents: { requiredConsentsAccepted: true },
      refreshConsents: vi.fn(),
    };
  });

  it("continua na clínica e nunca é mandado para o painel administrativo", () => {
    const { getByText } = render(
      <DashboardLayoutInner>
        <p>conteúdo da clínica</p>
      </DashboardLayoutInner>,
    );

    expect(replace).not.toHaveBeenCalledWith("/admin");
    expect(getByText("conteúdo da clínica")).toBeInTheDocument();
  });
});
