import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * `?tab=` de uma aba que existe mas não está liberada para quem está logado
 * caía no estado e abria a página com o conteúdo em branco. Agora cai na aba
 * padrão (Perfil), com as mesmas condições que mostram o botão e o conteúdo.
 */

let authState: {
  user: {
    id: string;
    accountId: string;
    role: "admin" | "collaborator";
  } | null;
  isAccountOwner: boolean;
  isPhysician: boolean;
  canIssueClinicalDocuments?: boolean;
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

describe("Configurações — deep-link para aba não liberada", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
    // Colaborador sem perfil de saúde, sem CRM e sem Administração.
    authState = {
      user: { id: "col-1", accountId: "doc-1", role: "collaborator" },
      isAccountOwner: false,
      isPhysician: false,
      isDoctor: false,
      can: () => false,
      subscription: null,
      updateUser: vi.fn().mockResolvedValue(undefined),
      refreshSubscription: vi.fn().mockResolvedValue(undefined),
    };
  });

  it.each([
    ["document-templates", "Gestão de modelos de col-1"],
    ["my-schedule", "Grade de col-1"],
    ["holidays", "Gestão de feriados"],
  ])("?tab=%s sem acesso abre o Perfil", async (tab, conteudo) => {
    searchParamsValue = new URLSearchParams(`tab=${tab}`);
    renderPage();

    const perfil = await screen.findByRole("button", { name: /Perfil/ });
    expect(perfil).toHaveAttribute("aria-current", "true");
    expect(await screen.findByText("Foto do Perfil")).toBeInTheDocument();
    expect(screen.queryByText(conteudo)).toBeNull();
  });

  it("profissional de saúde sem CRM abre a própria agenda, mas não os modelos", async () => {
    authState.isDoctor = true;
    searchParamsValue = new URLSearchParams("tab=my-schedule");
    const { unmount } = renderPage();
    await waitFor(() =>
      expect(screen.getByText("Grade de col-1")).toBeInTheDocument(),
    );
    unmount();

    searchParamsValue = new URLSearchParams("tab=document-templates");
    renderPage();
    expect(await screen.findByText("Foto do Perfil")).toBeInTheDocument();
    expect(screen.queryByText("Gestão de modelos de col-1")).toBeNull();
  });

  it("médico (CRM) continua abrindo os modelos por deep-link", async () => {
    authState.isDoctor = true;
    authState.isPhysician = true;
    authState.canIssueClinicalDocuments = true;
    searchParamsValue = new URLSearchParams("tab=document-templates");
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByText("Gestão de modelos de col-1"),
      ).toBeInTheDocument(),
    );
  });
});
