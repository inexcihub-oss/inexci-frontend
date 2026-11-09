import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render-with-providers";

const replace = vi.fn();
let tabParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/admin/ia",
  useSearchParams: () => new URLSearchParams(tabParam ? `tab=${tabParam}` : ""),
}));

const svc = vi.hoisted(() => ({
  getAiUsageReport: vi.fn(),
  getAiEfficiency: vi.fn(),
}));
vi.mock("@/services/admin.service", () => ({ adminService: svc }));

vi.mock("@/lib/calendar-date", async (orig) => ({
  ...(await orig<typeof import("@/lib/calendar-date")>()),
  spTodayISODate: () => "2026-10-10",
}));

vi.mock("@/components/dashboard/charts/AreaLineChart", () => ({
  AreaLineChart: ({ data }: { data: unknown }) => (
    <div data-testid="area-chart" data-series={JSON.stringify(data)} />
  ),
}));

import { AdminAiUsage } from "./AdminAiUsage";

const row = (over: Record<string, unknown>) => ({
  groupKey: "x",
  name: null,
  email: null,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokens: 1000,
  totalCalls: 10,
  totalRecords: 4,
  costUsdCents: 200,
  avgLatencyMs: 100,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  tabParam = null;
  svc.getAiUsageReport.mockImplementation(
    async (p: { groupBy: string; from?: string }) => {
      const previous = p.from?.startsWith("2026-09-");
      if (p.groupBy === "owner")
        return [
          row({
            groupKey: "o-1",
            name: "Clínica Ortho",
            email: "a@ortho.com",
            costUsdCents: previous ? 100 : 150,
          }),
          row({
            groupKey: "o-2",
            name: "Clínica Cardio",
            email: "b@cardio.com",
            costUsdCents: previous ? 0 : 50,
          }),
        ];
      if (p.groupBy === "user")
        return [row({ groupKey: "u-1", name: "Dra. Ana", email: "ana@x.com" })];
      if (p.groupBy === "model")
        return [row({ groupKey: "gpt-4o", costUsdCents: 310 })];
      return [
        row({ groupKey: "2026-10-02", costUsdCents: 600 }),
        row({ groupKey: "2026-10-01", costUsdCents: 400 }),
      ];
    },
  );
  svc.getAiEfficiency.mockResolvedValue({
    totalTurns: 42,
    totalConversations: 7,
    totalUsers: 3,
    avgTotalTokens: 1500,
    p50TotalTokens: 1200,
    p95TotalTokens: 3000,
    avgLatencyMs: 900,
    p50LatencyMs: 800,
    p95LatencyMs: 2000,
    avgCallsPerTurn: 1.5,
    cacheHitRate: 33,
    ragHitRate: 50,
    totalCostCents: 1240,
    avgCostCents: 30,
    byDraftType: [],
  });
});

describe("AdminAiUsage", () => {
  it("mostra custo do mês, projeção e série diária ordenada", async () => {
    renderWithProviders(<AdminAiUsage />);
    expect(await screen.findByText("Custo do mês")).toBeInTheDocument();
    expect(await screen.findByText("US$ 10,00")).toBeInTheDocument();
    expect(screen.getByText("US$ 31,00")).toBeInTheDocument();
    expect(screen.getByText("Projeção do mês")).toBeInTheDocument();
    const series = JSON.parse(
      screen.getByTestId("area-chart").getAttribute("data-series")!,
    );
    expect(series.map((s: { date: string }) => s.date)).toEqual([
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("lista contas com custo médio e variação contra o período anterior", async () => {
    renderWithProviders(<AdminAiUsage />);
    const link = await screen.findByRole("link", { name: "Clínica Ortho" });
    const rowEl = link.closest("tr")!;
    await waitFor(() =>
      expect(within(rowEl).getByText("+50%")).toBeInTheDocument(),
    );
    expect(within(rowEl).getByText("US$ 1,50")).toBeInTheDocument();
    expect(within(rowEl).getByText("US$ 0,38")).toBeInTheDocument();
    const cardio = screen.getByRole("link", { name: "Clínica Cardio" });
    expect(within(cardio.closest("tr")!).getByText("novo")).toBeInTheDocument();
  });

  it("filtra por origem e ajusta o rótulo", async () => {
    renderWithProviders(<AdminAiUsage />);
    await screen.findByRole("link", { name: "Clínica Ortho" });
    fireEvent.change(screen.getByLabelText("Origem"), {
      target: { value: "document_extraction" },
    });
    await waitFor(() =>
      expect(svc.getAiUsageReport).toHaveBeenCalledWith(
        expect.objectContaining({ source: "document_extraction" }),
      ),
    );
    expect(
      await screen.findByRole("columnheader", { name: "Extrações" }),
    ).toBeInTheDocument();
  });

  it("troca de aba pela URL e esconde a projeção fora do mês corrente", async () => {
    renderWithProviders(<AdminAiUsage />);
    await screen.findByText("Projeção do mês");
    fireEvent.click(screen.getByRole("button", { name: "30 dias" }));
    await waitFor(() =>
      expect(screen.queryByText("Projeção do mês")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Custo no período")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Por modelo" }));
    expect(replace).toHaveBeenCalledWith("/admin/ia?tab=modelos", {
      scroll: false,
    });
  });

  it("renderiza as abas usuários, modelos e eficiência", async () => {
    tabParam = "usuarios";
    const view = renderWithProviders(<AdminAiUsage />);
    expect(await screen.findByText("Dra. Ana")).toBeInTheDocument();
    tabParam = "modelos";
    view.rerender(<AdminAiUsage />);
    expect(await screen.findByText("gpt-4o")).toBeInTheDocument();
    tabParam = "eficiencia";
    view.rerender(<AdminAiUsage />);
    expect(await screen.findByText("Turnos")).toBeInTheDocument();
    expect(screen.getByText("US$ 12,40")).toBeInTheDocument();
    expect(screen.queryByLabelText("Origem")).not.toBeInTheDocument();
  });
});
