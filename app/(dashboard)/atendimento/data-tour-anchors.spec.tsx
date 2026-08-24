import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Permission } from "@/lib/permissions";
import AtendimentoHubPage from "./page";

/**
 * Prova que o hub de atendimento carrega a âncora `data-tour` que o tour de
 * onboarding (`lib/onboarding/tour-registry.ts`) espera encontrar —
 * "atendimento-nova-consulta". Sem este teste, remover o atributo (ou trocar
 * o elemento) quebra o tour em silêncio. O botão é condicional a
 * `Permission.AGENDA`, por isso o viewer simulado precisa tê-la.
 */

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

    // Espera a lista carregar (0 registros) antes de checar os botões: sem
    // isso, `findAllByRole` resolve assim que o botão do cabeçalho aparece,
    // sem esperar o EmptyState (que só monta depois do fetch resolver).
    await screen.findByText("Nenhuma consulta");

    // Sem registros, a tela também renderiza um botão "Nova consulta" dentro
    // do EmptyState — a âncora precisa estar só no botão do cabeçalho, senão
    // `querySelector` pega o primeiro do DOM, que pode ser o errado.
    const botoes = screen.getAllByRole("button", { name: /Nova consulta/i });
    expect(botoes.length).toBeGreaterThan(1);

    const comAncora = botoes.filter((el) =>
      el.closest('[data-tour="atendimento-nova-consulta"]'),
    );
    expect(comAncora).toHaveLength(1);
  });
});
