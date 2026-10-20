import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Permission } from "@/lib/permissions";
import AtendimentoHubPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: (p: Permission) => p === Permission.AGENDA,
  }),
}));

vi.mock("@/services/appointment.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/appointment.service")
  >();
  return {
    ...original,
    appointmentService: {
      ...original.appointmentService,
      getAgendaPage: vi.fn().mockResolvedValue({ total: 0, records: [] }),
    },
  };
});

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AtendimentoHubPage />
    </QueryClientProvider>,
  );
}

describe("Tela de Atendimento — âncora do tour", () => {
  it('expõe data-tour="atendimento-nova-consulta" no botão do cabeçalho, não no do EmptyState', async () => {
    renderPagina();

    await screen.findByText("Nenhuma consulta");

    const botoes = screen.getAllByRole("button", { name: /Nova consulta/i });
    expect(botoes.length).toBeGreaterThan(1);

    const comAncora = botoes.filter((el) =>
      el.closest('[data-tour="atendimento-nova-consulta"]'),
    );
    expect(comAncora).toHaveLength(1);
  });

  it('expõe data-tour="atendimento-abas" no grupo de abas Hoje/Próximas/Realizadas', async () => {
    renderPagina();
    await screen.findByText("Nenhuma consulta");

    const abas = screen.getByRole("button", { name: "Hoje" });
    expect(abas.closest('[data-tour="atendimento-abas"]')).not.toBeNull();
  });
});
