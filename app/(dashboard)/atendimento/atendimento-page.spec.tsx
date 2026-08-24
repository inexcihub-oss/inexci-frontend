import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

const CONSULTA = {
  id: "a-1",
  doctorId: "d-1",
  patientId: "p-1",
  type: "return" as const,
  status: "confirmed" as const,
  scheduledAt: "2026-08-03T13:00:00.000Z",
  durationMinutes: 30,
  notes: null,
  cancellationReason: null,
  patient: { id: "p-1", name: "Ana Beatriz" },
};

const { getAgendaPage } = vi.hoisted(() => ({
  getAgendaPage: vi.fn(),
}));

vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: {
      getAgendaPage: getAgendaPage,
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

import AtendimentoHubPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AtendimentoHubPage />
    </QueryClientProvider>,
  );
}

/**
 * Grupo 2 do mapa: colaborador com Atendimento e sem Agenda alcança o hub de
 * atendimento (leitura aceita Atendimento) mas não pode escrever consulta —
 * "Nova consulta" e "Ver agenda" devem sumir.
 */
describe("AtendimentoHubPage — gating por Agenda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
    getAgendaPage.mockResolvedValue({ records: [CONSULTA], total: 1 });
  });

  it("esconde 'Nova consulta' e 'Ver agenda' para quem só tem Atendimento", async () => {
    authState = { can: (p) => p === Permission.ATENDIMENTO };
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Nova consulta/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Ver agenda/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra 'Nova consulta' e 'Ver agenda' para quem tem Agenda", async () => {
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Nova consulta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver agenda/i }),
    ).toBeInTheDocument();
  });
});

/**
 * D-15: o backend corta a lista num teto por requisição. A aba "Realizadas"
 * é a única sem janela de datas, então é a que pode encostar nele — e antes
 * `total` vinha igual ao tamanho da página, tornando o corte invisível.
 */
describe("AtendimentoHubPage — aviso de lista cortada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
  });

  it("avisa quando o total do servidor é maior que os registros recebidos", async () => {
    getAgendaPage.mockResolvedValue({ records: [CONSULTA], total: 1103 });
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(
      screen.getByText(/Mostrando as 1 consultas mais recentes de 1103/i),
    ).toBeInTheDocument();
  });

  it("não avisa quando a lista veio inteira", async () => {
    getAgendaPage.mockResolvedValue({ records: [CONSULTA], total: 1 });
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(screen.queryByText(/mais recentes de/i)).not.toBeInTheDocument();
  });
});
