import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const svc = vi.hoisted(() => ({ getMetricsOverview: vi.fn() }));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

import { AdminDashboard } from "./AdminDashboard";

const overview = (over: Record<string, unknown> = {}) => ({
  period: "30d",
  from: "2026-09-24T03:00:00Z",
  to: "2026-10-24T03:00:00Z",
  accounts: { total: 40, newInPeriod: 5, bySituation: [] },
  trials: {
    active: 8,
    endingIn7Days: 3,
    expired: 2,
    conversion90d: {
      cohortFrom: "2026-07-01T00:00:00Z",
      cohortTo: "2026-10-09T00:00:00Z",
      started: 20,
      converted: 5,
      ratePercent: 25,
    },
  },
  revenue: {
    mrrCents: 1234500,
    payingAccounts: 12,
    mrrPreviousCents: 1000000,
    mrrChangePercent: 23.5,
    month: "2026-10",
    receivedThisMonthCents: 800000,
    nextMonth: "2026-11",
    nextMonthForecastCents: 1300000,
    nextMonthForecastGuaranteedCents: 1200000,
    nextMonthForecastTrialConversionCents: 100000,
    nextMonthForecastIsEstimate: true,
    delinquentCents: 29900,
    delinquentAccounts: 2,
  },
  churn: {
    month: "2026-10",
    canceledAccounts: 1,
    payingAccountsAtStart: 10,
    accountsRatePercent: 10,
    lostMrrCents: 9900,
    mrrAtStartCents: 990000,
    revenueRatePercent: 1,
  },
  engagement: {
    activeAccounts7d: 20,
    activeAccounts30d: 30,
    inactiveAccounts7d: 4,
    surgeryRequestsCreated: 50,
    appointments: 80,
    patientsCreated: 33,
  },
  ai: {
    costMonthUsdCents: 5000,
    platformCostMonthUsdCents: 5200,
    costLast30DaysUsdCents: 6000,
    averageCostPerActiveAccountUsdCents: 200,
    topAccounts: [
      {
        ownerId: "o1",
        name: "Clínica Ortho",
        email: "a@o.com",
        costUsdCents: 1500,
        totalTokens: 1000,
      },
    ],
  },
  errors: {
    spikeThreshold: 10,
    accountsWithSpike24h: 2,
    topSpikeAccounts: [{ ownerId: "o9", ownerName: "Clínica Z", total: 42 }],
  },
  security: {
    accountThreshold: 10,
    platformThreshold: 50,
    platformTotal24h: 13,
    platformSpike: false,
    accountsWithSpike24h: 1,
    topSpikeAccounts: [
      {
        ownerId: "o8",
        ownerName: "Clínica Y",
        total: 12,
        users: 1,
        lastSeenAt: "2026-10-24T12:00:00Z",
      },
    ],
  },
  activation: {
    cohortAccounts: 6,
    withFirstPatient: 4,
    activated: 3,
    activationRatePercent: 50,
    averageDaysToActivate: 4.5,
    medianDaysToActivate: 3,
  },
  accountsAtRisk: {
    total: 7,
    items: [
      {
        ownerId: "o3",
        name: "Clínica Parada",
        score: 18,
        mainReason: "Ninguém da clínica acessa há 40 dias",
      },
      { ownerId: "o4", name: "Clínica Mista", score: 35, mainReason: null },
    ],
  },
  series: {
    mrrMonthly: [
      { month: "2026-08", mrrCents: 900000 },
      { month: "2026-09", mrrCents: 1000000 },
      { month: "2026-10", mrrCents: 1234500 },
    ],
    newVsCanceled: [{ month: "2026-10", newAccounts: 5, canceledAccounts: 1 }],
    accountsByPlan: [
      {
        planId: "p1",
        planName: "Starter",
        billingPeriod: "MONTHLY",
        accounts: 7,
      },
    ],
    trialFunnel: { started: 20, withCard: 10, converted: 5 },
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  svc.getMetricsOverview.mockResolvedValue(overview());
});

describe("AdminDashboard", () => {
  it("renderiza KPIs, financeiro, gráficos e alertas", async () => {
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByText("Receita recorrente mensal (MRR)", {
        selector: "p",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Quanto as assinaturas ativas pagam por mês"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/12\.345,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/23,5%/)).toBeInTheDocument();
    expect(screen.getByText("25,0%")).toBeInTheDocument();
    expect(screen.getByText("10,0%")).toBeInTheDocument();
    expect(screen.getByText(/8\.000,00/)).toBeInTheDocument();
    expect(screen.getByText("Estimativa")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver previsão detalhada" }),
    ).toHaveAttribute("href", "/admin/faturamento?tab=previsao");
    expect(screen.getByText("Clínica Ortho")).toBeInTheDocument();
    expect(screen.getByText("US$ 15,00")).toBeInTheDocument();
    expect(screen.getByText("Convertidos")).toBeInTheDocument();
  });

  it("funil nunca passa de 100% quando uma etapa supera a primeira", async () => {
    const base = overview();
    svc.getMetricsOverview.mockResolvedValue({
      ...base,
      series: {
        ...base.series,
        trialFunnel: { started: 2, withCard: 5, converted: 4 },
      },
    });
    renderWithProviders(<AdminDashboard />);

    const etapa = (await screen.findByText("Com cartão")).closest("li");
    const barra = etapa?.querySelector<HTMLElement>("[style]");
    expect(barra?.style.width).toBe("100%");
    const inicio = screen.getByText("Trials iniciados").closest("li");
    expect(inicio?.querySelector<HTMLElement>("[style]")?.style.width).toBe(
      "40%",
    );
  });

  it("expõe novas e canceladas por mês em tabela acessível", async () => {
    renderWithProviders(<AdminDashboard />);

    const table = await screen.findByRole("table", {
      name: "Novas contas e cancelamentos por mês",
    });
    expect(table).toHaveTextContent("out/2026");
    expect(table).toHaveTextContent("5");
    expect(table).toHaveTextContent("1");
  });

  it("sem variação do MRR, explica que falta histórico em vez de mostrar seta", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({
        revenue: { ...overview().revenue, mrrChangePercent: null },
      }),
    );
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByText("Sem histórico suficiente para comparar"),
    ).toBeInTheDocument();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("mostra o uso da plataforma no período escolhido", async () => {
    renderWithProviders(<AdminDashboard />);

    const uso = await screen.findByRole("region", {
      name: "Uso da plataforma",
    });
    expect(uso).toHaveTextContent("Contagens dos últimos 30 dias");
    expect(uso).toHaveTextContent("Novas assinaturas5");
    expect(uso).toHaveTextContent("Solicitações cirúrgicas50");
    expect(uso).toHaveTextContent("Consultas80");
    expect(uso).toHaveTextContent("Pacientes33");
  });

  it("alerta com contagem fica colorido e alerta zerado fica neutro", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({
        revenue: { ...overview().revenue, delinquentAccounts: 0 },
      }),
    );
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByRole("link", {
        name: "3 trials terminam esta semana",
      }),
    ).toHaveClass("bg-amber-50");
    expect(
      screen.getByRole("link", { name: "0 contas inadimplentes" }),
    ).toHaveClass("bg-white");
  });

  it("os alertas levam à lista filtrada", async () => {
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByRole("link", {
        name: "3 trials terminam esta semana",
      }),
    ).toHaveAttribute("href", "/admin/clientes?trial=7");
    expect(
      screen.getByRole("link", { name: "2 contas inadimplentes" }),
    ).toHaveAttribute("href", "/admin/clientes?situacao=past_due");
    expect(
      screen.getByRole("link", { name: "4 contas sem acesso há 7 dias" }),
    ).toHaveAttribute("href", "/admin/clientes?inativos=7");
    const pico = screen.getByRole("link", {
      name: "2 contas com pico de erros",
    });
    expect(pico).toHaveAttribute("href", "/admin/erros?periodo=1");
    expect(pico).toHaveTextContent("10 ou mais erros nas últimas 24 h");
    expect(pico).toHaveClass("bg-red-50");
  });

  it("alerta de segurança leva à tela de Segurança com o período de hoje", async () => {
    renderWithProviders(<AdminDashboard />);

    const alerta = await screen.findByRole("link", {
      name: "1 conta com pico de falhas de login",
    });
    expect(alerta).toHaveAttribute("href", "/admin/seguranca?periodo=1");
    expect(alerta).toHaveTextContent("10 ou mais falhas nas últimas 24 h");
    expect(alerta).toHaveClass("bg-red-50");
  });

  it("pico só na plataforma, sem conta identificada, também acende o alerta", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({
        security: {
          accountThreshold: 10,
          platformThreshold: 50,
          platformTotal24h: 80,
          platformSpike: true,
          accountsWithSpike24h: 0,
          topSpikeAccounts: [],
        },
      }),
    );
    renderWithProviders(<AdminDashboard />);

    const alerta = await screen.findByRole("link", {
      name: "80 falhas de login na plataforma",
    });
    expect(alerta).toHaveTextContent("pode ser tentativa de ataque");
    expect(alerta).toHaveClass("bg-red-50");
  });

  it("mostra traço e o motivo quando não há histórico", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({
        trials: {
          active: 1,
          endingIn7Days: 0,
          expired: 0,
          conversion90d: {
            cohortFrom: "2026-07-01T00:00:00Z",
            cohortTo: "2026-10-09T00:00:00Z",
            started: 0,
            converted: 0,
            ratePercent: null,
          },
        },
      }),
    );
    renderWithProviders(<AdminDashboard />);

    const clientes = await screen.findByRole("region", { name: "Clientes" });
    expect(clientes).toHaveTextContent("Conversão do trial—");
    expect(clientes).toHaveTextContent("Sem histórico suficiente");
  });

  it("troca o período e refaz a consulta", async () => {
    renderWithProviders(<AdminDashboard />);
    await screen.findByText("Convertidos");

    fireEvent.click(screen.getByRole("button", { name: "12 meses" }));

    await waitFor(() =>
      expect(svc.getMetricsOverview).toHaveBeenCalledWith("12m"),
    );
    expect(
      await screen.findByText("Contagens dos últimos 12 meses"),
    ).toBeInTheDocument();
  });

  it("contas em risco: piores primeiro, com o motivo e link para a conta e para a lista filtrada", async () => {
    renderWithProviders(<AdminDashboard />);

    const section = await screen.findByRole("region", {
      name: "Contas em risco",
    });
    const conta = within(section).getByRole("link", {
      name: "Clínica Parada: nota 18",
    });
    expect(conta).toHaveAttribute("href", "/admin/clientes/o3");
    expect(conta).toHaveTextContent("Ninguém da clínica acessa há 40 dias");
    expect(
      within(section).getByRole("link", { name: "Clínica Mista: nota 35" }),
    ).toHaveTextContent("Vários fatores somados");
    expect(
      within(section).getByRole("link", { name: "Ver todas (7)" }),
    ).toHaveAttribute("href", "/admin/clientes?saude=risco&ordem=saude");
  });

  it("sem contas em risco mostra a mensagem positiva", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({ accountsAtRisk: { total: 0, items: [] } }),
    );
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByText("Nenhuma conta em risco agora."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ver todas/ })).toBeNull();
  });

  it("ativação: funil do cadastro à primeira consulta ou SC e tempo até ativar", async () => {
    renderWithProviders(<AdminDashboard />);

    const section = await screen.findByRole("region", {
      name: "Ativação de novas contas",
    });
    expect(section).toHaveTextContent("Cadastros6");
    expect(section).toHaveTextContent("Com 1º paciente4");
    expect(section).toHaveTextContent("Com 1ª consulta ou SC3");
    expect(section).toHaveTextContent("50,0% das contas ativaram");
    expect(section).toHaveTextContent("4,5 dias");
    expect(section).toHaveTextContent("Mediana: 3 dias");
  });

  it("ativação sem cadastros no período não mostra taxa", async () => {
    svc.getMetricsOverview.mockResolvedValue(
      overview({
        activation: {
          cohortAccounts: 0,
          withFirstPatient: 0,
          activated: 0,
          activationRatePercent: null,
          averageDaysToActivate: null,
          medianDaysToActivate: null,
        },
      }),
    );
    renderWithProviders(<AdminDashboard />);

    const section = await screen.findByRole("region", {
      name: "Ativação de novas contas",
    });
    expect(section).toHaveTextContent("Nenhuma conta cadastrada no período");
    expect(section).toHaveTextContent("Mediana: —");
  });

  it("mostra mensagem de erro", async () => {
    svc.getMetricsOverview.mockRejectedValue(new Error("falha"));
    renderWithProviders(<AdminDashboard />);

    expect(
      await screen.findByText("Não foi possível carregar o dashboard"),
    ).toBeInTheDocument();
  });
});
