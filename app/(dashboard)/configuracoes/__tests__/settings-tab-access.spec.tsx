import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("Configurações — deep-link para aba não liberada", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
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

describe("Configurações — navegação em lista no celular", () => {
  beforeEach(() => {
    searchParamsValue = new URLSearchParams();
    authState = {
      user: { id: "doc-1", accountId: "doc-1", role: "admin" },
      isAccountOwner: true,
      isPhysician: true,
      canIssueClinicalDocuments: true,
      isDoctor: true,
      can: () => true,
      subscription: null,
      updateUser: vi.fn().mockResolvedValue(undefined),
      refreshSubscription: vi.fn().mockResolvedValue(undefined),
    };
  });

  const menu = () =>
    screen.getByRole("navigation", { name: "Seções das configurações" });

  it("sem seção na URL mostra a lista; tocar abre a seção com voltar", async () => {
    const pushState = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("button", { name: "Feriados" });
    expect(
      screen.queryByRole("button", { name: "Voltar para Configurações" }),
    ).toBeNull();
    expect(menu().parentElement).not.toHaveClass("hidden");

    await user.click(within(menu()).getByRole("button", { name: "Feriados" }));

    expect(await screen.findByText("Gestão de feriados")).toBeInTheDocument();
    expect(pushState).toHaveBeenCalledWith(
      null,
      "",
      "/configuracoes?tab=holidays",
    );
    expect(menu().parentElement).toHaveClass("hidden", "lg:block");
    expect(
      screen.getByRole("heading", { level: 2, name: "Feriados" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Voltar para Configurações" }),
    );

    expect(back).toHaveBeenCalled();
    expect(menu().parentElement).not.toHaveClass("hidden");
    expect(
      screen.queryByRole("button", { name: "Voltar para Configurações" }),
    ).toBeNull();
    pushState.mockRestore();
    back.mockRestore();
  });

  it("deep-link abre direto a seção, e voltar leva à lista sem sair da página", async () => {
    searchParamsValue = new URLSearchParams("tab=holidays");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Voltar para Configurações" }),
    );

    expect(back).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/configuracoes");
    expect(menu().parentElement).not.toHaveClass("hidden");
    replaceState.mockRestore();
    back.mockRestore();
  });

  it("colaborador sem áreas só vê Minha conta e Ajuda", async () => {
    authState = {
      ...authState,
      user: { id: "col-1", accountId: "doc-1", role: "collaborator" },
      isAccountOwner: false,
      isPhysician: false,
      canIssueClinicalDocuments: false,
      isDoctor: false,
      can: () => false,
    };
    renderPage();

    await screen.findByRole("button", { name: "Perfil" });
    expect(
      within(menu())
        .getAllByRole("group")
        .map((g) => g.getAttribute("aria-labelledby")),
    ).toEqual(["grupo-config-conta", "grupo-config-ajuda"]);
  });
});
