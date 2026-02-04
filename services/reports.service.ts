import api from "@/lib/api";

export interface DashboardData {
  surgery_request: {
    total: number;
    total_authorized: number;
    total_scheduled: number;
    total_done: number;
    total_invoiced: number | null;
    total_received: number | null;
    total_by_health_plan: Array<{
      health_plan_name: string;
      total: number;
    }>;
    total_by_status: Array<{
      status: number;
      total: number;
    }>;
    total_by_hospital: Array<{
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
  pending_reanalysis: number;
}

export interface MonthlyEvolutionData {
  month: string;
  count: number;
}

export const reportsService = {
  /**
   * Busca os dados do dashboard
   */
  async getDashboard(): Promise<DashboardData> {
    const response = await api.get<DashboardData>("/reports/dashboard");
    return response.data;
  },

  /**
   * Busca a evolução temporal (últimos X dias)
   */
  async getTemporalEvolution(
    days: number = 30,
  ): Promise<TemporalEvolutionData[]> {
    const response = await api.get<TemporalEvolutionData[]>(
      `/reports/temporal-evolution?days=${days}`,
    );
    return response.data;
  },

  /**
   * Busca o tempo médio de conclusão
   */
  async getAverageCompletionTime(): Promise<AverageCompletionTimeData> {
    const response = await api.get<AverageCompletionTimeData>(
      "/reports/average-completion-time",
    );
    return response.data;
  },

  /**
   * Busca as notificações pendentes
   */
  async getPendingNotifications(): Promise<PendingNotificationsData> {
    const response = await api.get<PendingNotificationsData>(
      "/reports/pending-notifications",
    );
    return response.data;
  },

  /**
   * Busca a evolução mensal de procedimentos
   */
  async getMonthlyEvolution(
    months: number = 6,
  ): Promise<MonthlyEvolutionData[]> {
    const response = await api.get<MonthlyEvolutionData[]>(
      `/reports/monthly-evolution?months=${months}`,
    );
    return response.data;
  },
};
