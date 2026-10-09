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

const { getAgendaCompleta } = vi.hoisted(() => ({
  getAgendaCompleta: vi.fn().mockResolvedValue({ total: 0, records: [] }),
}));
vi.mock("@/services/appointment.service", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/appointment.service")
  >("@/services/appointment.service");
  return {
    ...actual,
    appointmentService: {
      getAgenda: vi.fn().mockResolvedValue([]),
      getAgendaCompleta,
      updateStatus: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const availability = vi.hoisted(() => ({
  getBlocks: vi.fn().mockResolvedValue([]),
  getHolidays: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/services/availability.service", () => ({
  availabilityService: availability,
}));

vi.mock("@/services/available-doctors.service", () => ({
  availableDoctorsService: {
    getAvailableDoctors: vi.fn().mockResolvedValue([]),
  },
}));

let authState: { can: (p: Permission) => boolean } = {
  can: (p: Permission) => p === Permission.AGENDA,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

import AgendaPage from "./page";
import { appointmentService } from "@/services/appointment.service";

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

function renderPage(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AgendaPage />
    </QueryClientProvider>,
  );
}

describe("AgendaPage — gating por Solicitações (cirurgias)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAgendaSurgeries.mockResolvedValue({ total: 0, records: [] });
    authState = { can: (p) => p === Permission.AGENDA };
  });

  it("não busca cirurgias e mantém a exportação de atendimentos sem Solicitações", async () => {
    renderPage();

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

describe("AgendaPage — bloqueios e feriados (MIG-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    availability.getBlocks.mockResolvedValue([]);
    availability.getHolidays.mockResolvedValue([]);
  });

  it("quem tem Agenda vê 'Bloquear horário', que abre o modal", async () => {
    authState = { can: (p) => p === Permission.AGENDA };
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Bloquear horário" }));
    expect(await screen.findByLabelText("Profissional")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Toda a clínica" })).toBeNull();
  });

  it("com Administração, o modal oferece 'Toda a clínica'", async () => {
    authState = {
      can: (p: Permission) =>
        p === Permission.AGENDA || p === Permission.ADMINISTRACAO,
    };
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Bloquear horário" }));
    expect(await screen.findByRole("option", { name: "Toda a clínica" })).toBeInTheDocument();
  });

  describe("bloqueio de toda a clínica na grade", () => {
    const bloqueios = () => {
      const ini = new Date();
      ini.setHours(14, 0, 0, 0);
      const fim = new Date(ini);
      fim.setHours(16, 0, 0, 0);
      return [
        {
          id: "bc",
          doctorId: null,
          clinicId: null,
          startsAt: ini.toISOString(),
          endsAt: fim.toISOString(),
          allDay: false,
          reason: "Reforma",
        },
      ];
    };

    it("sem Administração aparece, mas não abre para editar/remover", async () => {
      authState = { can: (p) => p === Permission.AGENDA };
      availability.getBlocks.mockResolvedValue(bloqueios());
      renderPage();
      const bloco = await screen.findByTitle("Clínica: Reforma");
      expect(bloco.tagName).toBe("DIV");
      expect(bloco.className).toContain("pointer-events-none");
      expect(
        screen.queryByRole("button", { name: /Editar bloqueio/ }),
      ).toBeNull();
    });

    it("com Administração abre o modal de edição", async () => {
      authState = {
        can: (p: Permission) =>
          p === Permission.AGENDA || p === Permission.ADMINISTRACAO,
      };
      availability.getBlocks.mockResolvedValue(bloqueios());
      renderPage();
      const user = userEvent.setup();
      const bloco = await screen.findByTitle("Clínica: Reforma");
      expect(bloco.tagName).toBe("DIV");
      expect(bloco.className).toContain("pointer-events-none");
      const rotulo = screen.getByRole("button", {
        name: "Editar bloqueio: Clínica: Reforma",
      });
      expect(bloco).toContainElement(rotulo);
      expect(rotulo.className).toContain("pointer-events-auto");
      await user.click(rotulo);
      expect(await screen.findByRole("button", { name: "Remover" })).toBeInTheDocument();
    });
  });

  it("sem Agenda não há botão de bloqueio", async () => {
    authState = {
      can: (p: Permission) => p === Permission.ATENDIMENTO,
    } as unknown as typeof authState;
    renderPage();
    await waitFor(() => expect(availability.getBlocks).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Bloquear horário" })).toBeNull();
  });

  it("desenha bloqueios e feriados da semana na grade", async () => {
    authState = { can: (p) => p === Permission.AGENDA };
    const hoje = new Date();
    const ini = new Date(hoje);
    ini.setHours(14, 0, 0, 0);
    const fim = new Date(hoje);
    fim.setHours(16, 0, 0, 0);
    availability.getBlocks.mockResolvedValue([
      {
        id: "b1",
        doctorId: null,
        clinicId: null,
        startsAt: ini.toISOString(),
        endsAt: fim.toISOString(),
        allDay: false,
        reason: "Reunião geral",
      },
    ]);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    availability.getHolidays.mockResolvedValue([
      { id: "h1", name: "Feriado teste", date: ymd(amanha), recurring: false, blocksAgenda: true },
    ]);
    renderPage();

    expect(await screen.findByTitle("Clínica: Reunião geral")).toBeInTheDocument();
    const mesmaSemana = amanha.getDay() !== 0;
    if (mesmaSemana) {
      expect(screen.getByTitle("Feriado: Feriado teste")).toBeInTheDocument();
    }
  });
});


describe("AgendaPage — consultas além do teto da API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
    availability.getBlocks.mockResolvedValue([]);
    availability.getHolidays.mockResolvedValue([]);
  });

  it("busca a agenda completa (todas as páginas) do intervalo visível", async () => {
    getAgendaCompleta.mockResolvedValue({ total: 0, records: [] });
    renderPage();
    await waitFor(() => expect(getAgendaCompleta).toHaveBeenCalled());
    const [query] = getAgendaCompleta.mock.calls[0];
    expect(query).toEqual({ from: expect.any(String), to: expect.any(String) });
    expect(query).not.toHaveProperty("take");
  });

  it("avisa quando o total do servidor passa do que veio", async () => {
    getAgendaCompleta.mockResolvedValue({ total: 25000, records: [] });
    renderPage();
    expect(
      await screen.findByText(/Mostrando 0 de 25000 consultas deste período/),
    ).toBeInTheDocument();
  });

  it("sem corte, nenhum aviso", async () => {
    getAgendaCompleta.mockResolvedValue({ total: 0, records: [] });
    renderPage();
    await waitFor(() => expect(getAgendaCompleta).toHaveBeenCalled());
    expect(screen.queryByText(/consultas deste período/)).toBeNull();
  });
});

describe("AgendaPage — visão mensal desenha feriados e bloqueios", () => {
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
    getAgendaCompleta.mockResolvedValue({ total: 0, records: [] });
  });

  it("mostra o feriado e o bloqueio no dia, na visão Mês", async () => {
    const hoje = new Date();
    const dia = new Date(hoje.getFullYear(), hoje.getMonth(), 15);
    const ini = new Date(dia);
    ini.setHours(9, 0, 0, 0);
    const fim = new Date(dia);
    fim.setHours(11, 0, 0, 0);
    availability.getBlocks.mockResolvedValue([
      {
        id: "bm",
        doctorId: null,
        clinicId: null,
        startsAt: ini.toISOString(),
        endsAt: fim.toISOString(),
        allDay: false,
        reason: "Dedetização",
      },
    ]);
    availability.getHolidays.mockResolvedValue([
      { id: "h", name: "Feriado do mês", date: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 16)), recurring: false, blocksAgenda: true },
    ]);

    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mês" }));

    expect(await screen.findByTitle("Clínica: Dedetização")).toBeInTheDocument();
    expect(await screen.findByTitle("Feriado: Feriado do mês")).toBeInTheDocument();
  });

  it("feriado que não trava a agenda não aparece", async () => {
    const hoje = new Date();
    availability.getBlocks.mockResolvedValue([]);
    availability.getHolidays.mockResolvedValue([
      { id: "h2", name: "Ponto facultativo", date: ymd(new Date(hoje.getFullYear(), hoje.getMonth(), 16)), recurring: false, blocksAgenda: false },
    ]);

    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Mês" }));
    await waitFor(() => expect(availability.getHolidays).toHaveBeenCalled());
    expect(screen.queryByTitle("Feriado: Ponto facultativo")).toBeNull();
  });
});

describe("AgendaPage — invalidação das consultas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { can: (p) => p === Permission.AGENDA };
    availability.getBlocks.mockResolvedValue([]);
    availability.getHolidays.mockResolvedValue([]);
  });

  it("mudar o status invalida todo o prefixo ['appointments'] (inclui o hub do Atendimento)", async () => {
    const inicio = new Date();
    inicio.setHours(10, 0, 0, 0);
    getAgendaCompleta.mockResolvedValue({
      total: 1,
      records: [
        {
          id: "a-1",
          doctorId: "d-1",
          patientId: "p-1",
          patient: { id: "p-1", name: "Paciente Teste" },
          type: "first_visit",
          status: "scheduled",
          scheduledAt: inicio.toISOString(),
          durationMinutes: 30,
          notes: null,
          cancellationReason: null,
          clinicId: null,
          isWalkIn: false,
        },
      ],
    });
    vi.mocked(appointmentService.updateStatus).mockResolvedValue(
      {} as never,
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const hubKey = ["appointments", "hub", "proximas"];
    queryClient.setQueryData(hubKey, []);
    renderPage(queryClient);

    const user = userEvent.setup();
    const evento = await screen.findByTitle(/Paciente Teste/);
    await user.click(evento);
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(queryClient.getQueryState(hubKey)?.isInvalidated).toBe(true),
    );
  });
});
