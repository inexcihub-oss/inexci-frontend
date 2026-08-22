import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Achado 2 da revisão final do onboarding: `router.push("/configuracoes?tab=profile")`
 * (o que o passo "assinatura" da trilha `documentos-do-medico` faz) NÃO
 * remonta a página — o App Router só troca a query. `activeTab` era lido de
 * `initialTab()` uma única vez (`useState(initialTab)`), então continuava em
 * `"onboarding"` mesmo depois da navegação, e a âncora `config-assinatura`
 * nunca chegava a renderizar. Este teste simula exatamente essa sequência:
 * monta com `?tab=onboarding`, troca o `useSearchParams` mockado para
 * `?tab=profile` (como o `router.push` faria) e re-renderiza — sem desmontar,
 * porque desmontar mascararia o bug (a montagem nova já leria a query certa
 * pelo `initialTab()`).
 */

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" };
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

let searchParamsValue = new URLSearchParams("tab=onboarding");

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
}));

vi.mock("@/components/onboarding/OnboardingSettingsTab", () => ({
  OnboardingSettingsTab: () => <div>Primeiros passos — conteúdo</div>,
}));

vi.mock("@/services/user.service", () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({
      name: "Dr. Médico",
      email: "medico@inexci.com",
      phone: "11999999999",
      isDoctor: true,
      crm: "12345",
      crmState: "SP",
      specialty: "Ortopedia",
    }),
    updateProfile: vi.fn(),
    updateDoctorProfile: vi.fn(),
  },
}));

vi.mock("@/services/notification.service", () => ({
  notificationService: {
    getSettings: vi.fn().mockResolvedValue({
      pushNotifications: true,
      whatsappNotifications: true,
      newSurgeryRequest: true,
      statusUpdate: true,
      pendencies: true,
      expiringDocuments: true,
      weeklyReport: false,
    }),
    updateSettings: vi.fn(),
  },
}));

import ConfiguracoesPage from "../page";

describe("Configurações — sincroniza a aba com mudanças de ?tab= em runtime", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams("tab=onboarding");
    authState = {
      user: { id: "user-1", accountId: "user-1", role: "admin" },
      isAccountOwner: true,
      subscription: null,
      updateUser: vi.fn(),
      refreshSubscription: vi.fn(),
    };
  });

  it("navegar para ?tab=profile sem desmontar troca a aba visível", async () => {
    const queryClient = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ConfiguracoesPage />
      </QueryClientProvider>,
    );

    // Confirma que abriu na aba certa antes de simular a navegação.
    expect(
      await screen.findByText("Primeiros passos — conteúdo"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Assinatura Digital")).not.toBeInTheDocument();

    // Simula o `router.push("/configuracoes?tab=profile")` do passo de
    // onboarding: a query muda, mas o componente NÃO desmonta.
    searchParamsValue = new URLSearchParams("tab=profile");
    rerender(
      <QueryClientProvider client={queryClient}>
        <ConfiguracoesPage />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Assinatura Digital")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Primeiros passos — conteúdo"),
    ).not.toBeInTheDocument();
  });
});
