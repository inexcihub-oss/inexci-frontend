import userEvent from "@testing-library/user-event";
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

describe("AtendimentoHubPage — paginação", () => {
  const consulta = (i: number) => ({
    ...CONSULTA,
    id: `a-${i}`,
    patient: { id: `p-${i}`, name: `Paciente ${String(i).padStart(2, "0")}` },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
  });

  it("pede a 1ª página com 20 itens e as contagens dos profissionais", async () => {
    getAgendaPage.mockResolvedValue({ records: [CONSULTA], total: 1 });
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(getAgendaPage).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        doctorIds: [],
        withDoctorCounts: true,
      }),
    );
  });

  it("o total sai com separador de milhar", async () => {
    getAgendaPage.mockResolvedValue({
      records: Array.from({ length: 20 }, (_, i) => consulta(i)),
      total: 2048,
    });
    renderPage();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Mostrando 20 de 2.048 consultas",
    );
  });

  it("lista que cabe numa página não mostra rodapé", async () => {
    getAgendaPage.mockResolvedValue({ records: [CONSULTA], total: 1 });
    renderPage();

    expect(await screen.findByText("Ana Beatriz")).toBeInTheDocument();
    expect(screen.queryByText(/Mostrando/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Carregar mais/ })).toBeNull();
  });

  it("carrega mais 20 a partir de onde parou, até o total", async () => {
    const primeira = Array.from({ length: 20 }, (_, i) => consulta(i));
    const segunda = Array.from({ length: 5 }, (_, i) => consulta(20 + i));
    getAgendaPage
      .mockResolvedValueOnce({ records: primeira, total: 25 })
      .mockResolvedValueOnce({ records: segunda, total: 25 });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Paciente 00")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 20 de 25 consultas");
    expect(screen.getByRole("button", { name: /Ver na agenda/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Carregar mais 5" }));

    expect(await screen.findByText("Paciente 24")).toBeInTheDocument();
    expect(getAgendaPage).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 20, take: 20, withDoctorCounts: false }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Mostrando 25 de 25 consultas");
    expect(screen.queryByRole("button", { name: /Carregar mais/ })).toBeNull();
  });

  it("falha ao carregar mais mantém a lista e oferece tentar de novo no rodapé", async () => {
    const primeira = Array.from({ length: 20 }, (_, i) => consulta(i));
    const segunda = Array.from({ length: 5 }, (_, i) => consulta(20 + i));
    getAgendaPage
      .mockResolvedValueOnce({ records: primeira, total: 25 })
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({ records: segunda, total: 25 });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Paciente 00")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Carregar mais 5" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar mais consultas.",
    );
    expect(screen.getByText("Paciente 00")).toBeInTheDocument();
    expect(
      screen.queryByText("Não foi possível carregar as consultas."),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByText("Paciente 24")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Paciente 00")).toBeInTheDocument();
  });

  it("botões do rodapé têm alvo de toque de 44px no celular", async () => {
    getAgendaPage.mockResolvedValue({
      records: Array.from({ length: 20 }, (_, i) => consulta(i)),
      total: 25,
    });
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Carregar mais 5" }),
    ).toHaveClass("min-h-[44px]");
    expect(screen.getByRole("button", { name: /Ver na agenda/ })).toHaveClass(
      "min-h-[44px]",
    );
  });
});

describe("AtendimentoHubPage — virada do dia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
    getAgendaPage.mockResolvedValue({ records: [], total: 0 });
  });

  it("ao voltar para a janela no dia seguinte, 'Hoje' busca o dia novo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.setSystemTime(new Date(2026, 9, 7, 18, 0, 0));
      renderPage();
      await vi.waitFor(() => expect(getAgendaPage).toHaveBeenCalled());
      expect(getAgendaPage.mock.calls[0][0].from).toBe(
        new Date(2026, 9, 7).toISOString(),
      );

      vi.setSystemTime(new Date(2026, 9, 8, 7, 30, 0));
      window.dispatchEvent(new Event("focus"));

      await vi.waitFor(() =>
        expect(
          getAgendaPage.mock.calls.some(
            ([q]) => q.from === new Date(2026, 9, 8).toISOString(),
          ),
        ).toBe(true),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
