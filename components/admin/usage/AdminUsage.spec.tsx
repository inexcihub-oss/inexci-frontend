import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const getUsage = vi.fn();

function mockMobile() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(max-width: 639px)",
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

function clearMobile() {
  delete (window as { matchMedia?: unknown }).matchMedia;
}
const getInactiveAccounts = vi.fn();
vi.mock("@/services/admin.service", () => ({
  adminService: {
    getUsage: (...a: unknown[]) => getUsage(...a),
    getInactiveAccounts: (...a: unknown[]) => getInactiveAccounts(...a),
  },
}));

vi.mock("@/components/dashboard/charts/AreaLineChart", () => ({
  AreaLineChart: ({ data }: { data: unknown }) => (
    <div data-testid="area-chart" data-series={JSON.stringify(data)} />
  ),
}));

import { AdminUsage } from "./AdminUsage";

const appointments = { scheduled: 12, completed: 8, cancelled: 2, noShow: 1 };

const usage = {
  from: "2026-09-24T00:00:00Z",
  to: "2026-10-24T00:00:00Z",
  totals: {
    surgeryRequestsCreated: 21,
    surgeryRequestsSent: 14,
    appointments,
    patientsCreated: 33,
    recordsFinalized: 17,
  },
  weekly: [
    {
      weekStart: "2026-10-05",
      surgeryRequestsCreated: 3,
      surgeryRequestsSent: 2,
      appointments,
      patientsCreated: 4,
      recordsFinalized: 2,
    },
    {
      weekStart: "2026-10-12",
      surgeryRequestsCreated: 5,
      surgeryRequestsSent: 3,
      appointments,
      patientsCreated: 6,
      recordsFinalized: 4,
    },
  ],
  activeAccounts: { last7Days: 6, last30Days: 9, totalClients: 11 },
  topBySurgeryRequests: [
    { ownerId: "o-1", name: "Clínica Ortho", email: "a@ortho.com", count: 15 },
  ],
  topByAppointments: [
    {
      ownerId: "o-2",
      name: "Clínica Cardio",
      email: "b@cardio.com",
      count: 40,
    },
  ],
};

const inactiveItem = {
  ownerId: "o-9",
  name: "Clínica Parada",
  email: "p@parada.com",
  plan: { id: "p", name: "Starter", priceCents: 0, billingPeriod: "MONTHLY" },
  situation: "canceled",
  daysLeft: null,
  daysOverdue: null,
  lastSeenAt: null,
  daysSinceLastSeen: null,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("AdminUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-24T02:00:00Z"),
    });
    getUsage.mockResolvedValue(usage);
    getInactiveAccounts.mockResolvedValue({
      days: 7,
      total: 1,
      items: [inactiveItem],
    });
  });

  it("mostra KPIs, rankings e contas paradas", async () => {
    renderWithProviders(<AdminUsage />);
    expect(await screen.findByText("SCs criadas")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("33")).toBeInTheDocument();
    const ranking = screen.getByRole("region", {
      name: "Mais solicitações cirúrgicas",
    });
    expect(within(ranking).getByText("Clínica Ortho")).toHaveAttribute(
      "href",
      "/admin/clientes/o-1",
    );
    expect(screen.getByText("Clínica Cardio")).toBeInTheDocument();
    expect(await screen.findByText("Clínica Parada")).toHaveAttribute(
      "href",
      "/admin/clientes/o-9",
    );
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    expect(screen.getByText("nunca")).toBeInTheDocument();
  });

  it("renderiza uma série real por gráfico", async () => {
    renderWithProviders(<AdminUsage />);
    await screen.findByText("SCs criadas");
    const sc = within(
      screen.getByRole("region", { name: "SCs criadas por semana" }),
    ).getByTestId("area-chart");
    const ap = within(
      screen.getByRole("region", { name: "Consultas agendadas por semana" }),
    ).getByTestId("area-chart");
    expect(JSON.parse(sc.dataset.series as string)).toEqual([
      { date: "2026-10-05", value: 3 },
      { date: "2026-10-12", value: 5 },
    ]);
    expect(JSON.parse(ap.dataset.series as string)).toEqual([
      { date: "2026-10-05", value: 12 },
      { date: "2026-10-12", value: 12 },
    ]);
  });

  it("período padrão usa limites de dia de São Paulo", async () => {
    renderWithProviders(<AdminUsage />);
    await screen.findByText("SCs criadas");
    expect(getUsage).toHaveBeenLastCalledWith({
      from: "2026-09-24T00:00:00-03:00",
      to: "2026-10-24T00:00:00-03:00",
    });
  });

  it("muda o período para 7 dias", async () => {
    renderWithProviders(<AdminUsage />);
    await screen.findByText("SCs criadas");
    fireEvent.click(
      within(screen.getByRole("group", { name: "Período" })).getByRole(
        "button",
        { name: "7 dias" },
      ),
    );
    await waitFor(() =>
      expect(getUsage).toHaveBeenLastCalledWith({
        from: "2026-10-17T00:00:00-03:00",
        to: "2026-10-24T00:00:00-03:00",
      }),
    );
  });

  it("intervalo personalizado envia limites de São Paulo com to exclusivo", async () => {
    renderWithProviders(<AdminUsage />);
    await screen.findByText("SCs criadas");
    fireEvent.click(screen.getByRole("button", { name: "Personalizado" }));
    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-10-01" },
    });
    fireEvent.change(screen.getByLabelText("Até"), {
      target: { value: "2026-10-10" },
    });
    await waitFor(() =>
      expect(getUsage).toHaveBeenLastCalledWith({
        from: "2026-10-01T00:00:00-03:00",
        to: "2026-10-11T00:00:00-03:00",
      }),
    );
  });

  it("troca os dias das contas paradas e mostra corte N de total", async () => {
    getInactiveAccounts.mockResolvedValueOnce({
      days: 7,
      total: 350,
      items: [inactiveItem],
    });
    renderWithProviders(<AdminUsage />);
    expect(await screen.findByText("1 de 350 contas")).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("group", { name: "Sem acesso há" })).getByRole(
        "button",
        { name: "30 dias" },
      ),
    );
    await waitFor(() => expect(getInactiveAccounts).toHaveBeenCalledWith(30));
  });

  it("mostra estado vazio das contas paradas", async () => {
    getInactiveAccounts.mockResolvedValue({ days: 7, total: 0, items: [] });
    renderWithProviders(<AdminUsage />);
    expect(await screen.findByText("Nenhuma conta parada")).toBeInTheDocument();
  });

  it("no celular as contas paradas viram cards", async () => {
    mockMobile();
    try {
      renderWithProviders(<AdminUsage />);
      const region = await screen.findByRole("region", {
        name: "Contas paradas",
      });
      const card = (await within(region).findByText("Clínica Parada")).closest(
        "li",
      )!;
      expect(within(region).queryByRole("table")).toBeNull();
      expect(card).toHaveTextContent("Cancelada");
      expect(card).toHaveTextContent("Último acesso");
      expect(card).toHaveTextContent("nunca");
    } finally {
      clearMobile();
    }
  });
});
