import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let authState: {
  user: {
    id: string;
    accountId: string;
    role: "admin" | "collaborator";
  } | null;
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

let searchParamsValue = new URLSearchParams();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ can: () => false, isDoctor: false, ...authState }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsValue,
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
}));

vi.mock("@/components/onboarding/OnboardingSettingsTab", () => ({
  OnboardingSettingsTab: () => (
    <button type="button">Refazer o onboarding</button>
  ),
}));

vi.mock("@/services/user.service", () => ({
  userService: {
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
    getPatientSettings: vi.fn().mockResolvedValue({
      appointmentScheduled: true,
      appointmentReminder: true,
      appointmentCancelled: true,
    }),
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
