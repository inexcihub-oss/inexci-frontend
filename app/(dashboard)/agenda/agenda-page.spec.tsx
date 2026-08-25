import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Permission } from "@/lib/permissions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/onboarding/OnboardingProvider", () => ({
  useOnboarding: () => ({ emTour: false, executarAcao: () => false }),
}));
vi.mock("@/components/onboarding/useOnboardingAction", () => ({
  useOnboardingAction: () => {},
}));

const { getAgendaSurgeries } = vi.hoisted(() => ({
  getAgendaSurgeries: vi.fn().mockResolvedValue({ total: 0, records: [] }),
}));
vi.mock("@/services/surgery-request.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/surgery-request.service")
  >("@/services/surgery-request.service");
  return {
    ...actual,
    surgeryRequestService: { getAgenda: getAgendaSurgeries },
  };
});

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: {
      getAgenda: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

let authState = { can: (p: Permission) => p === Permission.AGENDA };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

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
    }));
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgendaPage />
    </QueryClientProvider>,
  );
}

/**
 * Grupo 5 (item à parte) do mapa: colaborador com Agenda e sem Solicitações
 * é a combinação inversa do preset "cirurgia" — legítima e antes quebrada,
 * porque a busca de cirurgias falhava e derrubava a tela inteira. A correção
 * é não buscar cirurgias sem a permissão, não deixar essa falha derrubar o
 * calendário e manter a exportação disponível apenas para atendimentos.
 */
describe("AgendaPage — gating por Solicitações (cirurgias)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAgendaSurgeries.mockResolvedValue({ total: 0, records: [] });
    authState = { can: (p) => p === Permission.AGENDA };
  });

  it("não busca cirurgias e mantém a exportação de atendimentos sem Solicitações", async () => {
    renderPage();

    // A agenda de consultas funciona normalmente.
    await waitFor(() => {
      expect(
        screen.queryByText(/Não foi possível carregar a agenda/i),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /filtro/i })).toBeInTheDocument();
    expect(screen.getByTitle("Exportar")).toBeInTheDocument();
    expect(getAgendaSurgeries).not.toHaveBeenCalled();
  });

  it("busca cirurgias e mostra a aba e a exportação para quem tem Solicitações", async () => {
    authState = {
      can: (p) => p === Permission.AGENDA || p === Permission.SOLICITACOES,
    };
    renderPage();

    await waitFor(() => {
      expect(getAgendaSurgeries).toHaveBeenCalled();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /filtro/i }));
    expect(screen.getByRole("button", { name: "Cirurgias" })).toBeInTheDocument();
    expect(screen.getByTitle("Exportar")).toBeInTheDocument();
  });

  /**
   * `refetch()` do TanStack Query ignora `enabled` — dispara a chamada de
   * qualquer jeito. Sem proteger `refetchAll`, clicar em "Atualizar" rearmava
   * exatamente o 403 que `enabled: podeVerCirurgias` evitava na carga
   * inicial, e o ramo de erro substituía o calendário inteiro sem saída
   * (o próprio "Tentar novamente" chama `refetchAll` de novo).
   */
  it("não busca cirurgias ao clicar em Atualizar, e o calendário continua de pé", async () => {
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(
        screen.queryByText(/Não foi possível carregar a agenda/i),
      ).not.toBeInTheDocument();
    });
    expect(getAgendaSurgeries).not.toHaveBeenCalled();

    await user.click(screen.getByTitle("Atualizar"));

    // `appointmentsQuery` pode recarregar normalmente — só a de cirurgias
    // fica de fora.
    expect(getAgendaSurgeries).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Não foi possível carregar a agenda/i),
    ).not.toBeInTheDocument();
  });

  it("busca cirurgias ao clicar em Atualizar para quem tem Solicitações", async () => {
    authState = {
      can: (p) => p === Permission.AGENDA || p === Permission.SOLICITACOES,
    };
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(getAgendaSurgeries).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByTitle("Atualizar"));

    await waitFor(() => {
      expect(getAgendaSurgeries).toHaveBeenCalledTimes(2);
    });
  });
});
