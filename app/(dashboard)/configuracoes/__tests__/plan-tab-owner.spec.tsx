import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Tarefa 18, Passo 6: o backend recusa `checkout`/`portal` do Stripe para
 * quem não é dono da conta (`user.id !== user.accountId`) — mesmo que seja
 * admin. A aba "Plano e Faturamento" precisa parar de aparecer nesse caso,
 * senão o usuário só descobre o bloqueio pelo erro do botão.
 */

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" } | null;
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
}));

vi.mock("@/services/user.service", () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({
      name: "Admin Convidado",
      email: "convidado@inexci.com",
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

describe("Configurações — aba de plano visível só para o dono da conta", () => {
  beforeEach(() => {
    authState = {
      user: null,
      isAccountOwner: false,
      subscription: null,
      updateUser: vi.fn(),
      refreshSubscription: vi.fn(),
    };
  });

  it("esconde a aba de plano de um admin que não é dono da conta", async () => {
    authState.user = { id: "user-2", accountId: "user-1", role: "admin" };
    authState.isAccountOwner = false;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Perfil")).toBeInTheDocument();
    });

    expect(screen.queryByText("Plano e Faturamento")).not.toBeInTheDocument();
  });

  it("mostra a aba de plano para o dono da conta (id === accountId)", async () => {
    authState.user = { id: "user-1", accountId: "user-1", role: "admin" };
    authState.isAccountOwner = true;

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Plano e Faturamento")).toBeInTheDocument();
    });
  });
});
