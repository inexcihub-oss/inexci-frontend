import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * MIG-05: "Minha Agenda" é do profissional de saúde (qualquer conselho) e
 * "Feriados" é de quem tem Administração. Ambas abrem por deep-link.
 */

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" } | null;
  isAccountOwner: boolean;
  isPhysician: boolean;
  isDoctor: boolean;
  can: (p: string) => boolean;
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

vi.mock("@/components/clinical/DocumentTemplatesSettings", () => ({
  DocumentTemplatesSettings: ({ doctorId }: { doctorId: string }) => (
    <p>Gestão de modelos de {doctorId}</p>
  ),
}));

vi.mock("@/components/availability/ScheduleWeekEditor", () => ({
  ScheduleWeekEditor: ({ doctorId }: { doctorId: string }) => (
    <p>Grade de {doctorId}</p>
  ),
}));
vi.mock("@/components/availability/HolidaysSettings", () => ({
  HolidaysSettings: () => <p>Gestão de feriados</p>,
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

describe("Configurações — Minha Agenda e Feriados (MIG-05)", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
    authState = {
      user: { id: "doc-1", accountId: "doc-1", role: "admin" },
      isAccountOwner: true,
      isPhysician: false,
      isDoctor: true,
      can: (p) => p === "administracao",
      subscription: null,
      updateUser: vi.fn().mockResolvedValue(undefined),
      refreshSubscription: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("profissional de saúde abre a própria grade por deep-link", async () => {
    searchParamsValue = new URLSearchParams("tab=my-schedule");
    renderPage();
    expect(
      await screen.findByRole("button", { name: /Minha Agenda/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Grade de doc-1")).toBeInTheDocument(),
    );
  });

  it("Administração abre os feriados por deep-link", async () => {
    searchParamsValue = new URLSearchParams("tab=holidays");
    renderPage();
    expect(await screen.findByRole("button", { name: /Feriados/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Gestão de feriados")).toBeInTheDocument(),
    );
  });

  it("sem perfil de saúde e sem Administração, nenhuma das duas aparece", async () => {
    authState.isDoctor = false;
    authState.can = () => false;
    searchParamsValue = new URLSearchParams("tab=holidays");
    renderPage();
    await screen.findByRole("button", { name: /Segurança/ });
    expect(screen.queryByRole("button", { name: /Minha Agenda/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Feriados/ })).toBeNull();
    expect(screen.queryByText("Gestão de feriados")).toBeNull();
  });
});
