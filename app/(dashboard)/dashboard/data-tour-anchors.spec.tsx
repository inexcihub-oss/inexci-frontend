import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "./page";

/**
 * Prova que a tela real do dashboard carrega as três âncoras `data-tour` que
 * a trilha `dashboard` (`lib/onboarding/tour-registry.ts`) espera encontrar —
 * "dashboard-kpis", "dashboard-filtros" e "dashboard-ver-kanban". Sem este
 * teste, remover o atributo (ou trocar o elemento) quebra o tour em silêncio.
 */

vi.mock("@/services/reports.service", () => ({
  reportsService: {
    getDashboardFull: vi.fn().mockResolvedValue({
      surgeryRequest: {
        total: 0,
        totalScheduled: 0,
        totalPerformed: 0,
        totalInvoicedValue: 0,
        totalReceivedValue: 0,
        totalByStatus: [],
        totalByHealthPlan: [],
        totalByHospital: [],
      },
      temporalEvolution: [],
      monthlyEvolution: [],
      averageCompletionTime: { averageDays: 0 },
      pendingNotifications: { total: 0, pendingAnalysis: 0, pendingScheduling: 0 },
    }),
  },
}));

function renderPagina() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe("Tela de Dashboard — âncoras do tour", () => {
  it("expõe dashboard-kpis, dashboard-filtros e dashboard-ver-kanban", async () => {
    renderPagina();

    await screen.findByText("Total de Solicitações");
    expect(document.querySelector('[data-tour="dashboard-kpis"]')).not.toBeNull();
    expect(
      document.querySelector('[data-tour="dashboard-filtros"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-tour="dashboard-ver-kanban"]'),
    ).not.toBeNull();
  });
});
