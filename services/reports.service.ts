import api from "@/lib/api";

export interface DashboardData {
  surgeryRequest: {
    total: number;
    totalScheduled: number;
    totalPerformed: number;
    totalInvoicedCount: number;
    totalInvoicedValue: number | null;
    totalReceivedValue: number | null;
    totalByHealthPlan: Array<{
      healthPlanId: string;
      healthPlanName: string;
      total: number;
    }>;
    totalByStatus: Array<{
      status: number;
      total: number;
    }>;
    totalByHospital: Array<{
      hospitalId: string;
      hospitalName: string;
      total: number;
    }>;
  };
}

export interface TemporalEvolutionData {
  date: string;
  count: string;
  invoicedValue: string | null;
}

export interface AverageCompletionTimeData {
  averageDays: number;
}

export interface PendingNotificationsData {
  total: number;
  pendingAnalysis: number;
  pendingScheduling: number;
}

export interface MonthlyEvolutionData {
  month: string;
  count: number;
}

export interface ReportFilters {
  hospitalId?: string;
  healthPlanId?: string;
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
}

/** Resposta do endpoint consolidado `/reports/dashboard-full` (P13). */
export interface DashboardFullData extends DashboardData {
  temporalEvolution: TemporalEvolutionData[];
  monthlyEvolution: MonthlyEvolutionData[];
  averageCompletionTime: AverageCompletionTimeData;
  pendingNotifications: PendingNotificationsData;
}

function buildParams(
  base: Record<string, string | number | undefined>,
  filters?: ReportFilters,
): string {
  const params = new URLSearchParams();
  const merged = { ...base, ...filters };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const reportsService = {
  /**
   * Dashboard consolidado (P13): 1 round-trip com todos os blocos (KPIs,
   * evoluções, tempo médio e alertas).
   */
  async getDashboardFull(
    filters?: ReportFilters,
    days: number = 30,
    months: number = 6,
  ): Promise<DashboardFullData> {
    const response = await api.get<DashboardFullData>(
      `/reports/dashboard-full${buildParams({ days, months }, filters)}`,
    );
    return response.data;
  },

  /**
   * Busca os dados do dashboard
   */
  async getDashboard(filters?: ReportFilters): Promise<DashboardData> {
    const response = await api.get<DashboardData>(
      `/reports/dashboard${buildParams({}, filters)}`,
    );
    return response.data;
  },

  /**
   * Busca a evolução temporal (últimos X dias)
   */
  async getTemporalEvolution(
    days: number = 30,
    filters?: ReportFilters,
  ): Promise<TemporalEvolutionData[]> {
    const response = await api.get<TemporalEvolutionData[]>(
      `/reports/temporal-evolution${buildParams({ days }, filters)}`,
    );
    return response.data;
  },

  /**
   * Busca o tempo médio de conclusão
   */
  async getAverageCompletionTime(
    filters?: ReportFilters,
  ): Promise<AverageCompletionTimeData> {
    const response = await api.get<AverageCompletionTimeData>(
      `/reports/average-completion-time${buildParams({}, filters)}`,
    );
    return response.data;
  },

  /**
   * Busca as notificações pendentes
   */
  async getPendingNotifications(
    filters?: ReportFilters,
  ): Promise<PendingNotificationsData> {
    const response = await api.get<PendingNotificationsData>(
      `/reports/pending-notifications${buildParams({}, filters)}`,
    );
    return response.data;
  },

  /**
   * Busca a evolução mensal de procedimentos
   */
  async getMonthlyEvolution(
    months: number = 6,
    filters?: ReportFilters,
  ): Promise<MonthlyEvolutionData[]> {
    const response = await api.get<MonthlyEvolutionData[]>(
      `/reports/monthly-evolution${buildParams({ months }, filters)}`,
    );
    return response.data;
  },
};
