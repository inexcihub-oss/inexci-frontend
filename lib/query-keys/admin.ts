import type {
  AdminMetricsPeriod,
  AdminInactiveDays,
  AdminUsageParams,
  AdminAiUsageParams,
  AdminAccountListParams,
  AuditLogListParams,
  AdminInvoiceListParams,
  NotificationLogListParams,
  NotificationLogStatsParams,
  AdminErrorsParams,
  AdminErrorOccurrencesParams,
  AdminFailedJobsParams,
  AdminStripeEventsParams,
  AdminTeamPeriodDays,
} from "@/services/admin.service";

const ALL = ["admin"] as const;

export const adminKeys = {
  all: ALL,
  accounts: (params: AdminAccountListParams = {}) =>
    [...ALL, "accounts", params] as const,
  account: (ownerId: string) => [...ALL, "account", ownerId] as const,
  accountTeam: (ownerId: string, days: AdminTeamPeriodDays = 30) =>
    [...ALL, "account", ownerId, "team", days] as const,
  accountActivation: (ownerId: string) =>
    [...ALL, "account", ownerId, "activation"] as const,
  accountSubscription: (ownerId: string) =>
    [...ALL, "account", ownerId, "subscription"] as const,
  metricsOverview: (period: AdminMetricsPeriod) =>
    [...ALL, "metrics", "overview", period] as const,
  usage: (params: AdminUsageParams = {}) => [...ALL, "usage", params] as const,
  inactiveAccounts: (days: AdminInactiveDays) =>
    [...ALL, "usage", "inactive", days] as const,
  aiUsage: (params: AdminAiUsageParams) =>
    [...ALL, "ai-usage", params] as const,
  aiEfficiency: (params: { from?: string; to?: string }) =>
    [...ALL, "ai-efficiency", params] as const,
  revenueSummary: (month?: string) =>
    [...ALL, "revenue", "summary", month ?? "current"] as const,
  revenueForecast: (months: number) =>
    [...ALL, "revenue", "forecast", months] as const,
  invoices: (params: AdminInvoiceListParams = {}) =>
    [...ALL, "revenue", "invoices", params] as const,
  delinquency: () => [...ALL, "revenue", "delinquency"] as const,
  accountInvoices: (ownerId: string, offset = 0) =>
    [...ALL, "account", ownerId, "invoices", offset] as const,
  coupons: () => [...ALL, "coupons"] as const,
  couponRedemptions: (id: string) =>
    [...ALL, "coupons", id, "redemptions"] as const,
  plans: () => [...ALL, "plans"] as const,
  team: () => [...ALL, "team"] as const,
  notificationsHealth: () =>
    [...ALL, "system", "notifications-health"] as const,
  systemJobs: () => [...ALL, "system", "jobs"] as const,
  notificationLogs: (params: NotificationLogListParams = {}) =>
    [...ALL, "notification-logs", params] as const,
  notificationLogStats: (params: NotificationLogStatsParams = {}) =>
    [...ALL, "notification-logs", "stats", params] as const,
  errors: (params: AdminErrorsParams = {}) =>
    [...ALL, "errors", params] as const,
  accountErrors: (ownerId: string, params: AdminErrorsParams = {}) =>
    [...ALL, "account", ownerId, "errors", params] as const,
  errorOccurrences: (
    fingerprint: string,
    params: AdminErrorOccurrencesParams = {},
  ) => [...ALL, "errors", fingerprint, "occurrences", params] as const,
  queues: () => [...ALL, "system", "queues"] as const,
  failedJobs: (params: AdminFailedJobsParams = {}) =>
    [...ALL, "system", "queues", "failed", params] as const,
  stripeEvents: (params: AdminStripeEventsParams = {}) =>
    [...ALL, "stripe-events", params] as const,
  security: (days: number) => [...ALL, "security", days] as const,
  accountSecurity: (ownerId: string, days: number) =>
    [...ALL, "account", ownerId, "security", days] as const,
  accountSecurityLogs: (ownerId: string, days: number) =>
    [...ALL, "account", ownerId, "security", "logs", days] as const,
  accountClinicalAccess: (ownerId: string, days: number) =>
    [...ALL, "account", ownerId, "clinical-access", days] as const,
  auditLogs: (params: AuditLogListParams = {}) =>
    [...ALL, "audit-logs", params] as const,
};
