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
  isPhysician: boolean;
  canIssueClinicalDocuments?: boolean;
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

vi.mock("@/components/clinical/DocumentTemplatesSettings", () => ({
  DocumentTemplatesSettings: ({ doctorId }: { doctorId: string }) => (
    <p>Gestão de modelos de {doctorId}</p>
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

describe("Configurações — aba Modelos de Documentos (MIG-06)", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
    authState = {
      user: { id: "doc-1", accountId: "doc-1", role: "admin" },
      isAccountOwner: true,
      isPhysician: true,
      canIssueClinicalDocuments: true,
      subscription: null,
      updateUser: vi.fn().mockResolvedValue(undefined),
      refreshSubscription: vi.fn().mockResolvedValue(undefined),
    };
  });

  it("médico com CRM vê a aba e abre a gestão por deep-link", async () => {
    searchParamsValue = new URLSearchParams("tab=document-templates");
    renderPage();

    expect(
      await screen.findByRole("button", { name: /Modelos de Documentos/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("Gestão de modelos de doc-1"),
      ).toBeInTheDocument(),
    );
  });

  it("dentista (CRO) também vê a aba de modelos", async () => {
    authState.isPhysician = false;
    authState.canIssueClinicalDocuments = true;
    searchParamsValue = new URLSearchParams("tab=document-templates");
    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText("Gestão de modelos de doc-1"),
      ).toBeInTheDocument(),
    );
  });

  it("quem não tem CRM nem CRO não vê a aba nem o conteúdo pelo deep-link", async () => {
    authState.isPhysician = false;
    authState.canIssueClinicalDocuments = false;
    searchParamsValue = new URLSearchParams("tab=document-templates");
    renderPage();

    await screen.findByRole("button", { name: /Segurança/ });
    expect(
      screen.queryByRole("button", { name: /Modelos de Documentos/ }),
    ).toBeNull();
    expect(screen.queryByText(/Gestão de modelos/)).toBeNull();
  });
});
