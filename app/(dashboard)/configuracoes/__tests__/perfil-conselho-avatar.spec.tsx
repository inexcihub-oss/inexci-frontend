import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Perfil em Configurações:
 * - o DONO da conta troca o próprio conselho (ele é a administração; não
 *   aparece na lista de colaboradores). Admin delegado e demais, não;
 * - remover o avatar gravado manda `avatarUrl: null` (antes nunca mandava).
 */

let authState: {
  user: { id: string; accountId: string; role: "admin" | "collaborator" };
  isAccountOwner: boolean;
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    subscription: null,
    updateUser: vi.fn().mockResolvedValue(undefined),
    refreshSubscription: vi.fn(),
    can: () => false,
    isDoctor: true,
    canIssueClinicalDocuments: false,
    ...authState,
  }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("tab=profile"),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@/components/billing/BillingSection", () => ({
  BillingSection: () => <div>Stub do billing</div>,
}));

vi.mock("@/hooks/useDoctorHeaderEditor", () => ({
  useDoctorHeaderEditor: () => ({
    loadingHeader: false,
    savingHeader: false,
    currentHeader: null,
    headerLogoPreview: null,
    headerLogoPosition: "left",
    headerContentHtml: "",
    headerLogoInputRef: { current: null },
    setHeaderLogoPosition: vi.fn(),
    setHeaderContentHtml: vi.fn(),
    handleHeaderLogoChange: vi.fn(),
    handleDeleteHeaderLogo: vi.fn(),
    handleSaveHeader: vi.fn(),
    handleDeleteHeader: vi.fn(),
  }),
}));

const updateProfile = vi.fn();
const updateDoctorProfile = vi.fn();

vi.mock("@/services/user.service", () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({
      name: "Dr. Dono da Silva",
      email: "dono@inexci.com",
      phone: "11999999999",
      avatarUrl: "https://cdn.exemplo/avatar.png",
      isDoctor: true,
      doctorProfile: {
        id: "dp-1",
        council: "CRM",
        crm: "12345",
        crmState: "SP",
        specialty: "Ortopedia",
      },
    }),
    updateProfile: (...args: unknown[]) => updateProfile(...args),
    updateDoctorProfile: (...args: unknown[]) => updateDoctorProfile(...args),
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

function salvar() {
  const botoes = screen.getAllByRole("button", { name: /Salvar Alterações/ });
  fireEvent.click(botoes[botoes.length - 1]);
}

describe("Configurações — conselho do próprio perfil", () => {
  beforeEach(() => {
    updateProfile.mockReset().mockResolvedValue({});
    updateDoctorProfile.mockReset().mockResolvedValue({});
  });

  it("dono da conta: Conselho é editável e a troca vai no PATCH", async () => {
    authState = {
      user: { id: "dono-1", accountId: "dono-1", role: "admin" },
      isAccountOwner: true,
    };
    renderPage();

    const conselho = await screen.findByLabelText("Conselho");
    await waitFor(() => expect(conselho).toHaveValue("CRM"));
    expect(conselho.tagName).toBe("SELECT");
    expect(conselho).toBeEnabled();
    expect(
      screen.queryByTitle(/fale com a administração da conta/),
    ).not.toBeInTheDocument();

    fireEvent.change(conselho, { target: { value: "CRO" } });
    salvar();

    await waitFor(() =>
      expect(updateDoctorProfile).toHaveBeenCalledWith("dono-1", {
        council: "CRO",
      }),
    );
  });

  it("admin delegado: Conselho segue desabilitado e não é enviado", async () => {
    authState = {
      user: { id: "deleg-1", accountId: "dono-1", role: "collaborator" },
      isAccountOwner: false,
    };
    renderPage();

    const conselho = await screen.findByLabelText("Conselho");
    expect(conselho.tagName).toBe("INPUT");
    expect(conselho).toBeDisabled();
  });
});

describe("Configurações — avatar", () => {
  beforeEach(() => {
    authState = {
      user: { id: "dono-1", accountId: "dono-1", role: "admin" },
      isAccountOwner: true,
    };
    updateProfile.mockReset().mockResolvedValue({});
    updateDoctorProfile.mockReset().mockResolvedValue({});
  });

  it("remover o avatar gravado manda avatarUrl: null", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Remover/ }));
    salvar();

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile.mock.calls[0][0]).toMatchObject({ avatarUrl: null });
  });

  it("sem mexer no avatar, o campo não é enviado", async () => {
    renderPage();

    await screen.findByRole("button", { name: /Remover/ });
    salvar();

    await waitFor(() => expect(updateProfile).toHaveBeenCalled());
    expect(updateProfile.mock.calls[0][0]).not.toHaveProperty("avatarUrl");
  });
});
