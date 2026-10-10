import { reportsService } from "@/services/reports.service";
import type {
  ReportFilters,
  MonthlyEvolutionData,
  PendingNotificationsData,
  DashboardData,
} from "@/services/reports.service";
import {
  ALL_STATUS_CODES,
  AUTHORIZED_STATUSES,
  STATUS_META,
  getStatusMeta,
} from "@/lib/surgery-request-status";

export const STATUS_ORDER = ALL_STATUS_CODES.map((num) => ({
  num,
  label: STATUS_META[num].label,
  color: STATUS_META[num].chartColor,
}));

export interface ProcessedDashboard {
  total: number;
  totalAuthorized: number;
  totalScheduled: number;
  totalDone: number;
  totalInvoiced: number;
  totalReceived: number;
  toReceive: number;
  approvalRate: number;
  avgCompletionDays: number;
  pendingNotifications: PendingNotificationsData;
  byStatus: Array<{
    status: number;
    label: string;
    total: number;
    color: string;
  }>;
  byHealthPlan: Array<{ name: string; count: number }>;
  byHospital: Array<{ name: string; count: number }>;
  temporalData: Array<{ date: string; count: number; invoiced: number }>;
  monthlyEvolution: MonthlyEvolutionData[];
}

export async function fetchDashboard(
  filters?: ReportFilters,
): Promise<ProcessedDashboard> {
  const full = await reportsService.getDashboardFull(filters);
  const dashData: DashboardData = { surgeryRequest: full.surgeryRequest };
  const evolutionData = full.temporalEvolution ?? [];
  const monthlyData = full.monthlyEvolution ?? [];
  const avgTimeData = full.averageCompletionTime ?? { averageDays: 0 };
  const notificationsData = full.pendingNotifications ?? {
    total: 0,
    pendingAnalysis: 0,
    pendingScheduling: 0,
  };

      const totalInvoiced =
        Number(dashData.surgeryRequest.totalInvoicedValue) || 0;
      const totalReceived =
        Number(dashData.surgeryRequest.totalReceivedValue) || 0;

      const statusTotals = new Map(
        dashData.surgeryRequest.totalByStatus.map((s) => [s.status, s.total]),
      );
      const totalAuthorized = AUTHORIZED_STATUSES.reduce(
        (sum, status) => sum + (statusTotals.get(status) || 0),
        0,
      );

      const processed: ProcessedDashboard = {
        total: dashData.surgeryRequest.total,
        totalAuthorized,
        totalScheduled: dashData.surgeryRequest.totalScheduled,
        totalDone: dashData.surgeryRequest.totalPerformed,
        totalInvoiced,
        totalReceived,
        toReceive: totalInvoiced - totalReceived,
        approvalRate:
          dashData.surgeryRequest.total > 0
            ? (totalAuthorized / dashData.surgeryRequest.total) * 100
            : 0,
        avgCompletionDays: avgTimeData.averageDays,
        pendingNotifications: notificationsData,
        byStatus: dashData.surgeryRequest.totalByStatus.map((item) => {
          const meta = getStatusMeta(item.status);
          return {
            status: item.status,
            label: meta?.label ?? "Desconhecido",
            total: item.total,
            color: meta?.chartColor ?? "#6b7280",
          };
        }),
        byHealthPlan: dashData.surgeryRequest.totalByHealthPlan.map((item) => ({
          name: item.healthPlanName,
          count: item.total,
        })),
        byHospital: dashData.surgeryRequest.totalByHospital.map((item) => ({
          name: item.hospitalName,
          count: item.total,
        })),
        temporalData: evolutionData.map((item) => ({
          date: item.date,
          count: parseInt(item.count) || 0,
          invoiced: parseFloat(item.invoicedValue || "0"),
        })),
        monthlyEvolution: monthlyData,
      };

  return processed;
}
