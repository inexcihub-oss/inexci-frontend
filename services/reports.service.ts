import api from "@/lib/api";

export interface DashboardData {
  surgery_request: {
    total: number;
    total_scheduled: number;
    total_performed: number;
    total_invoiced_count: number;
    total_invoiced_value: number | null;
    total_received_value: number | null;
    total_by_health_plan: Array<{
      health_plan_id: string;
      health_plan_name: string;
      total: number;
    }>;
    total_by_status: Array<{
      status: number;
      total: number;
    }>;
    total_by_hospital: Array<{
      hospital_id: string;
      hospital_name: string;
      total: number;
    }>;
  };
}

export interface TemporalEvolutionData {
  date: string;
  count: string;
  invoiced_value: string | null;
}

export interface AverageCompletionTimeData {
  average_days: number;
}

export interface PendingNotificationsData {
  total: number;
  pending_analysis: number;
  pending_scheduling: number;
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
