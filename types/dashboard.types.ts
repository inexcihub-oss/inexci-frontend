export interface DashboardKPI {
  totalSurgeries: number;
  approvalRate: number;
  averageCompletionTime: number;
  pendingNotifications: number;
}

export interface FinancialSummary {
  totalInvoiced: number;
  totalReceived: number;
  toReceive: number;
  expectedTotal: number;
}

export interface HealthPlanDistribution {
  name: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  statusNumber: number;
  total: number;
  color: string;
}

export interface HospitalDistribution {
  name: string;
  count: number;
}

export interface DashboardStats {
  kpis: DashboardKPI;
  financial: FinancialSummary;
  proceduresByHealthPlan: HealthPlanDistribution[];
  proceduresByStatus: StatusDistribution[];
  proceduresByHospital: HospitalDistribution[];
}

export interface TemporalEvolution {
  date: string;
  invoiced_value: string;
}

export interface AverageCompletionTime {
  average_days: number;
}

export interface PendingNotifications {
  total: number;
  pending_analysis: number;
  pending_reanalysis: number;
}
