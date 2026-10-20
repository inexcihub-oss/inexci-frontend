import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  can: (p: string) => boolean;
  isAccountOwner: boolean;
  subscription: unknown;
  updateUser: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isDoctor: false,
    isPhysician: false,
    canIssueClinicalDocuments: false,
    ...authState,
  }),
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
    getPatientSettings: vi.fn(),
    updatePatientSettings: vi.fn(),
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

const patientSettings = {
  appointmentScheduled: true,
  appointmentReminder: true,
  appointmentCancelled: true,
};

describe("Configurações — avisos aos pacientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getSettings).mockResolvedValue(
      settings as never,
    );
    vi.mocked(notificationService.updateSettings).mockResolvedValue(
      settings as never,
    );
    vi.mocked(notificationService.getPatientSettings).mockResolvedValue({
      ...patientSettings,
    });
    vi.mocked(notificationService.updatePatientSettings).mockImplementation(
      async (data) => ({ ...patientSettings, ...data }),
    );
    authState = {
      user: { id: "user-1", accountId: "user-1", role: "admin" },
      can: (p) => p === "administracao",
      isAccountOwner: true,
      subscription: null,
      updateUser: vi.fn(),
      refreshSubscription: vi.fn(),
    };
  });

  it("administração vê os três avisos com o estado da conta", async () => {
    vi.mocked(notificationService.getPatientSettings).mockResolvedValue({
      ...patientSettings,
      appointmentReminder: false,
    });
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /Avisos aos pacientes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: /Consulta agendada/i }),
    ).toBeChecked();
    expect(
      screen.getByRole("switch", {
        name: /Lembrete e confirmação de consulta/i,
      }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("switch", { name: /Consulta cancelada/i }),
    ).toBeChecked();
  });

  it("desliga a confirmação de consulta e salva na conta", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("switch", {
        name: /Lembrete e confirmação de consulta/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /Salvar/i }));

    await waitFor(() => {
      expect(notificationService.updatePatientSettings).toHaveBeenCalledWith({
        appointmentScheduled: true,
        appointmentReminder: false,
        appointmentCancelled: true,
      });
    });
    expect(notificationService.updateSettings).toHaveBeenCalled();
  });

  it("sem administração: não vê o card nem chama a rota da conta", async () => {
    authState = {
      ...authState,
      user: { id: "user-2", accountId: "user-1", role: "collaborator" },
      can: () => false,
      isAccountOwner: false,
    };
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("switch", { name: /Menções por e-mail/i });
    expect(
      screen.queryByRole("heading", { name: /Avisos aos pacientes/i }),
    ).not.toBeInTheDocument();
    expect(notificationService.getPatientSettings).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Salvar/i }));
    await waitFor(() => {
      expect(notificationService.updateSettings).toHaveBeenCalled();
    });
    expect(notificationService.updatePatientSettings).not.toHaveBeenCalled();
  });

  it("falha ao carregar os avisos esconde o card sem quebrar a aba", async () => {
    vi.mocked(notificationService.getPatientSettings).mockRejectedValue(
      new Error("rede"),
    );
    renderPage();

    await screen.findByRole("switch", { name: /Menções por e-mail/i });
    expect(
      screen.queryByRole("heading", { name: /Avisos aos pacientes/i }),
    ).not.toBeInTheDocument();
  });
});
