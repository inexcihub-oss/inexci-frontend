import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgendaPage from "./page";

// jsdom não implementa matchMedia; `CalendarTimeGrid` usa para detectar telas
// estreitas.
beforeEach(() => {
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

/**
 * Prova que a tela real de agenda carrega a âncora `data-tour` que o tour de
 * onboarding (`lib/onboarding/tour-registry.ts`) espera encontrar —
 * "agenda-nova-consulta". Sem este teste, remover o atributo (ou trocar o
 * elemento) quebra o tour em silêncio: `useTargetRect` só reporta "ausente" e
 * o passo é pulado, sem nenhum erro visível em dev.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    can: () => true,
  }),
}));

vi.mock("@/services/surgery-request.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/surgery-request.service")
  >();
  return {
    ...original,
    surgeryRequestService: {
      ...original.surgeryRequestService,
      getAgenda: vi.fn().mockResolvedValue({ total: 0, records: [] }),
    },
  };
});

vi.mock("@/services/appointment.service", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/appointment.service")
  >();
  return {
    ...original,
    appointmentService: {
      ...original.appointmentService,
      getAgenda: vi.fn().mockResolvedValue([]),
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
      <AgendaPage />
    </QueryClientProvider>,
  );
}

describe("Tela de Agenda — âncoras do tour", () => {
  it('expõe data-tour="agenda-nova-consulta" no botão de nova consulta', async () => {
    renderPagina();

    const botao = await screen.findByText("Nova consulta");
    expect(botao.closest('[data-tour="agenda-nova-consulta"]')).not.toBeNull();
  });
});
