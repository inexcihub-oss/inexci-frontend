import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * `config-assinatura` é a âncora que o tour de onboarding usa para o passo
 * obrigatório da trilha "Configurar sua assinatura" (`tour-registry.ts`,
 * `requiresDoctor: true`, `required: true`). Sem este teste, remover o
 * atributo do `<Card>` não quebra nada visível — o passo, sendo obrigatório,
 * encerraria o tour com aviso em produção, mas nenhum teste apontaria a causa.
 */

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", accountId: "user-1", role: "admin" },
    isAccountOwner: true,
    subscription: null,
    updateUser: vi.fn(),
    refreshSubscription: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=profile"),
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
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

function renderPage() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfiguracoesPage />
    </QueryClientProvider>,
  );
}

describe("Configurações — âncora do tour na Assinatura Digital", () => {
  it("expõe data-tour=\"config-assinatura\" na seção do médico", async () => {
    renderPage();

    const titulo = await screen.findByText("Assinatura Digital");
    await waitFor(() => {
      expect(titulo.closest('[data-tour="config-assinatura"]')).not.toBeNull();
    });
  });
});
