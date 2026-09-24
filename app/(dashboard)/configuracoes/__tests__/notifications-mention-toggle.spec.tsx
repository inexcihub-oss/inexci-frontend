import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * O e-mail de menção é o único canal de e-mail que o usuário pode desligar
 * além do resumo semanal — e desligá-lo não pode derrubar a notificação
 * dentro da plataforma, por isso o toggle vive em "Tipos de Notificação" e
 * grava `mentionEmails`.
 */

const settings = {
  pushNotifications: true,
  whatsappNotifications: true,
  newSurgeryRequest: true,
  statusUpdate: true,
  pendencies: true,
  expiringDocuments: true,
  weeklyReport: false,
  mentionEmails: true,
};

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" };
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=notifications"),
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
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

import { notificationService } from "@/services/notification.service";
import ConfiguracoesPage from "../page";

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfiguracoesPage />
    </QueryClientProvider>,
  );
}

describe("Configurações — e-mail de menções", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getSettings).mockResolvedValue(
      settings as never,
    );
    vi.mocked(notificationService.updateSettings).mockResolvedValue(
      settings as never,
    );
    authState = {
      user: { id: "user-1", accountId: "user-1", role: "admin" },
      isAccountOwner: true,
      subscription: null,
      updateUser: vi.fn(),
      refreshSubscription: vi.fn(),
    };
  });

  it("mostra o toggle com o estado vindo do backend", async () => {
    renderPage();

    const toggle = await screen.findByRole("switch", {
      name: /Menções por e-mail/i,
    });
    expect(toggle).toBeChecked();
  });

  it("salva o toggle desligado", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("switch", { name: /Menções por e-mail/i }),
    );
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(notificationService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ mentionEmails: false }),
      );
    });
  });
});
