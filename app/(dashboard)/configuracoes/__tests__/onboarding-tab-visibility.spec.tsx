import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Tarefa 15: a aba "Primeiros passos" é o único caminho de volta para quem
 * pulou o onboarding — precisa aparecer para QUALQUER usuário autenticado,
 * sem condicional de permissão ou de papel. Diferente da aba de Plano
 * (`plan-tab-owner.spec.tsx`), que só o dono da conta vê.
 */

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" } | null;
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

let searchParamsValue = new URLSearchParams();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
}));

// Stub: esta suíte testa se a aba abre via deep-link (`?tab=onboarding`) e se
// o TabButton/render-branch são incondicionais — não o conteúdo interno da
// aba, que já tem cobertura própria em OnboardingSettingsTab.spec.tsx. Um
// stub identificável evita depender de OnboardingProvider aqui.
vi.mock("@/components/onboarding/OnboardingSettingsTab", () => ({
  OnboardingSettingsTab: () => (
    <button type="button">Refazer o onboarding</button>
  ),
}));

vi.mock("@/services/user.service", () => ({
  userService: {
    // Colaborador sem doctor_profile e sem nenhuma área liberada: o pior
    // caso para provar que a aba não depende de nada disso.
    getProfile: vi.fn().mockResolvedValue({
      name: "Colaborador Sem Área",
      email: "semarea@inexci.com",
      phone: "11999999999",
      isDoctor: false,
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

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfiguracoesPage />
    </QueryClientProvider>,
  );
}

describe("Configurações — aba Primeiros passos é incondicional", () => {
  beforeEach(() => {
    authState = {
      user: { id: "user-2", accountId: "user-1", role: "collaborator" },
      isAccountOwner: false,
      subscription: null,
      updateUser: vi.fn(),
      refreshSubscription: vi.fn(),
    };
    searchParamsValue = new URLSearchParams();
  });

  it("aparece mesmo para um colaborador sem dono de conta e sem nenhuma área", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Perfil")).toBeInTheDocument();
    });

    expect(screen.getByText("Primeiros passos")).toBeInTheDocument();
  });

  it("aparece também para o dono da conta", async () => {
    authState.user = { id: "user-1", accountId: "user-1", role: "admin" };
    authState.isAccountOwner = true;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Perfil")).toBeInTheDocument();
    });

    expect(screen.getByText("Primeiros passos")).toBeInTheDocument();
  });

  it("?tab=onboarding abre a aba já selecionada", async () => {
    searchParamsValue = new URLSearchParams("tab=onboarding");

    renderPage();

    expect(
      await screen.findByRole("button", { name: /refazer o onboarding/i }),
    ).toBeInTheDocument();
  });
});
