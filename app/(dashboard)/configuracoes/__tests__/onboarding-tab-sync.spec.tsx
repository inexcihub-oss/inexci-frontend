import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" };
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

let searchParamsValue = new URLSearchParams("tab=onboarding");

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

    expect(
      await screen.findByText("Primeiros passos — conteúdo"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Assinatura Digital")).not.toBeInTheDocument();

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
