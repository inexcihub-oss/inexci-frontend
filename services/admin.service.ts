import api from "@/lib/admin-api";
import type { ApiSchema } from "@/types/api";

export type PlatformAuditLogItem = ApiSchema<"PlatformAuditLogItemDto">;
export type PlatformAuditLogList = ApiSchema<"PlatformAuditLogListResponseDto">;
export type PlatformAuditAction = PlatformAuditLogItem["action"];

export type AdminAccountItem = ApiSchema<"AdminAccountItemDto">;
export type AdminAccountList = ApiSchema<"AdminAccountListResponseDto">;
export type AdminAccountDetail = ApiSchema<"AdminAccountDetailDto">;
export type AdminAccountSubscription = ApiSchema<"AdminAccountSubscriptionDto">;
export type AdminTeamMember = ApiSchema<"AdminTeamMemberDto">;
export type AdminTeam = ApiSchema<"AdminTeamResponseDto">;
export type AdminTeamPeriodDays = 7 | 30 | 90;
export type AdminAccountActivation = ApiSchema<"AdminAccountActivationDto">;
export type AdminActivationMilestone = ApiSchema<"AdminActivationMilestoneDto">;
export type AdminMetricsActivation = ApiSchema<"AdminMetricsActivationDto">;
export type PlatformAdminMember = Omit<
  ApiSchema<"PlatformAdminMemberDto">,
  "hasClinic"
>;
export type CreatePlatformAdminPayload = ApiSchema<"CreatePlatformAdminDto">;
export type RevokePlatformAdminPayload = ApiSchema<"RevokePlatformAdminDto">;
export type ResetPlatformAdminAccessPayload = RevokePlatformAdminPayload;
export type PlatformAdminActionResult =
  ApiSchema<"PlatformAdminActionResultDto">;
export type ExtendTrialPayload = ApiSchema<"ExtendTrialDto">;
export type GrantInternalAccessPayload = ApiSchema<"GrantInternalAccessDto">;
export type RevokeInternalAccessPayload = ApiSchema<"RevokeInternalAccessDto">;
export type AccountStatusPayload = ApiSchema<"AccountStatusActionDto">;
export type AdminAccountStatusResult = ApiSchema<"AdminAccountStatusResultDto">;
export type AdminSubscriptionActionResult =
  ApiSchema<"AdminSubscriptionActionResultDto">;
export type AdminAccountSituationFilter = AdminAccountItem["situation"];

export type AdminRevenueSummary = ApiSchema<"AdminRevenueSummaryDto">;
export type AdminForecast = ApiSchema<"AdminForecastResponseDto">;
export type AdminForecastMonth = ApiSchema<"AdminForecastMonthDto">;
export type AdminForecastItem = ApiSchema<"AdminForecastItemDto">;
export type AdminInvoice = ApiSchema<"AdminInvoiceDto">;
export type AdminInvoiceList = ApiSchema<"AdminInvoiceListResponseDto">;
export type AdminInvoiceStatus = AdminInvoice["status"];
export type AdminDelinquency = ApiSchema<"AdminDelinquencyResponseDto">;
export type AdminMetricsOverview = ApiSchema<"AdminMetricsOverviewDto">;
export type AdminMetricsPeriod = AdminMetricsOverview["period"];
export type AdminPlan = ApiSchema<"AdminPlanDto">;

export type AdminCoupon = ApiSchema<"AdminCouponDto">;
export type AdminCouponList = ApiSchema<"AdminCouponListResponseDto">;
export type CreateCouponPayload = ApiSchema<"CreateCouponDto">;
export type AdminCouponActionResult = ApiSchema<"AdminCouponActionResultDto">;
export type AdminCouponRedemption = ApiSchema<"AdminCouponRedemptionDto">;
export type AdminCouponRedemptions =
  ApiSchema<"AdminCouponRedemptionsResponseDto">;

export type AdminErrorsOverview = ApiSchema<"AdminErrorsOverviewDto">;
export type AdminAccountErrors = ApiSchema<"AdminAccountErrorsDto">;
export type AdminErrorFingerprint = ApiSchema<"AdminErrorFingerprintDto">;
export type AdminErrorDay = ApiSchema<"AdminErrorDayDto">;
export type AdminErrorOccurrences = ApiSchema<"AdminErrorOccurrencesDto">;
export type AdminErrorSource = AdminErrorFingerprint["source"];
export type AdminErrorPeriodDays = 1 | 7 | 30 | 90;

export type AdminSecurityOverview = ApiSchema<"AdminSecurityOverviewDto">;
export type AdminAccountSecurity = ApiSchema<"AdminAccountSecurityDto">;
export type AdminAccountSecurityLogs = ApiSchema<"AdminAccountSecurityLogsDto">;
export type AdminSecurityTotals = ApiSchema<"AdminSecurityTotalsDto">;
export type AdminSecurityDay = ApiSchema<"AdminSecurityDayDto">;
export type AdminSecurityAccount = ApiSchema<"AdminSecurityAccountDto">;
export type AdminSecurityUser = ApiSchema<"AdminSecurityUserDto">;
export type AdminSecurityEventType = AdminSecurityDay["eventType"];
export type AdminSecurityPeriodDays = 1 | 7 | 30 | 90;

export type AdminClinicalAccess = ApiSchema<"AdminClinicalAccessDto">;
export type AdminClinicalAccessUser = ApiSchema<"AdminClinicalAccessUserDto">;
export type AdminClinicalAccessExport =
  ApiSchema<"AdminClinicalAccessExportResultDto">;
export type AdminClinicalAccessDays = 7 | 30 | 90;
export type AdminClinicalAccessPatientRow =
  ApiSchema<"AdminClinicalAccessPatientRowDto">;
export type AdminClinicalAccessPatientResult =
  ApiSchema<"AdminClinicalAccessPatientResultDto">;

export type AdminQueuesOverview = ApiSchema<"AdminQueuesOverviewDto">;
export type AdminQueueSummary = ApiSchema<"AdminQueueSummaryDto">;
export type AdminQueueName = AdminQueueSummary["name"];
export type AdminFailedJob = ApiSchema<"AdminFailedJobDto">;
export type AdminFailedJobs = ApiSchema<"AdminFailedJobsResponseDto">;
export type AdminQueueJobAction = "retry" | "discard";

export interface AdminFailedJobsParams {
  queue?: AdminQueueName;
  limit?: number;
  offset?: number;
}

export type AdminStripeEvent = ApiSchema<"AdminGatewayEventDto">;
export type AdminStripeEvents = ApiSchema<"AdminGatewayEventsResponseDto">;
export type AdminStripeEventSituation = AdminStripeEvent["situation"];

export interface AdminStripeEventsParams {
  ownerId?: string;
  problems?: boolean;
  limit?: number;
  offset?: number;
}

export interface AdminErrorsParams {
  days?: AdminErrorPeriodDays;
  source?: AdminErrorSource;
  limit?: number;
  offset?: number;
}

export interface AdminErrorOccurrencesParams {
  days?: AdminErrorPeriodDays;
  ownerId?: string;
}

export type NotificationLogItem = ApiSchema<"NotificationLogItemDto">;
export type NotificationLogList = ApiSchema<"NotificationLogListResponseDto">;
export type NotificationLogStatsRow = ApiSchema<"NotificationLogStatsRowDto">;
export type NotificationChannel = NotificationLogItem["channel"];
export type NotificationSendStatus = NotificationLogItem["status"];

export interface NotificationLogStatsParams {
  channel?: NotificationChannel;
  ownerId?: string;
  from?: string;
  to?: string;
}

export interface NotificationLogListParams extends NotificationLogStatsParams {
  status?: NotificationSendStatus;
  limit?: number;
  offset?: number;
}

export interface AdminInvoiceListParams {
  status?: AdminInvoiceStatus;
  ownerId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export type AdminUsage = ApiSchema<"AdminUsageResponseDto">;
export type AdminUsageWeek = ApiSchema<"AdminUsageWeekDto">;
export type AdminUsageRankingItem = ApiSchema<"AdminUsageRankingItemDto">;
export type AdminInactiveAccount = ApiSchema<"AdminInactiveAccountDto">;
export type AdminInactiveAccounts =
  ApiSchema<"AdminInactiveAccountsResponseDto">;
export type AdminInactiveDays = 7 | 15 | 30;

export type AdminAiUsageRow = ApiSchema<"AiUsageReportRowDto">;
export type AdminAiGroupBy = "user" | "owner" | "model" | "day";

export interface AdminAiUsageParams {
  from?: string;
  to?: string;
  groupBy: AdminAiGroupBy;
  ownerId?: string;
  source?: string;
}

export interface AdminAiEfficiencyReport {
  windowFrom: string | null;
  windowTo: string | null;
  totalTurns: number;
  totalConversations: number;
  totalUsers: number;
  avgTotalTokens: number;
  p50TotalTokens: number;
  p95TotalTokens: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgCallsPerTurn: number;
  cacheHitRate: number;
  ragHitRate: number;
  totalCostCents: number | null;
  avgCostCents: number | null;
  byDraftType: Array<{
    draftType: string;
    turns: number;
    avgPromptTokens: number;
    avgTotalTokens: number;
    cacheHitRate: number;
  }>;
}

export interface AdminUsageParams {
  from?: string;
  to?: string;
}

export interface AdminAccountListParams {
  search?: string;
  situation?: AdminAccountSituationFilter;
  planId?: string;
  trialEndingInDays?: number;
  inactiveDays?: number;
  health?: "healthy" | "attention" | "risk";
  sortBy?: "createdAt" | "trialEndsAt" | "lastSeenAt" | "mrr" | "health";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface AuditLogListParams {
  targetOwnerId?: string;
  actorUserId?: string;
  action?: PlatformAuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export type NotificationHealthChannel = "redis" | "smtp" | "twilio";

export interface NotificationHealthIndicator {
  status: "up" | "down";
  message?: string;
  [key: string]: unknown;
}

export interface NotificationsHealth {
  status: "ok" | "error" | "shutting_down";
  info?: Partial<Record<string, NotificationHealthIndicator>>;
  error?: Partial<Record<string, NotificationHealthIndicator>>;
  details: Partial<Record<string, NotificationHealthIndicator>>;
}

export type SystemJobKey = "stale_requests" | "weekly_summary";

export interface SystemJobManualRun {
  at: string;
  by: string | null;
  result: unknown;
}

export interface SystemJob {
  key: SystemJobKey;
  name: string;
  description: string;
  schedule: string;
  lastManualRun: SystemJobManualRun | null;
}

export interface SystemJobRunResult {
  key: SystemJobKey;
  count: number;
}

export const adminService = {
  async listAccounts(
    params: AdminAccountListParams = {},
  ): Promise<AdminAccountList> {
    const { data } = await api.get<AdminAccountList>("/admin/accounts", {
      params,
    });
    return data;
  },

  async listAllAccounts(
    params: Omit<AdminAccountListParams, "limit" | "offset"> = {},
  ): Promise<AdminAccountItem[]> {
    const limit = 100;
    const items: AdminAccountItem[] = [];
    let offset = 0;
    for (;;) {
      const page = await adminService.listAccounts({
        ...params,
        limit,
        offset,
      });
      items.push(...page.items);
      offset += limit;
      if (page.items.length === 0 || offset >= page.total) return items;
    }
  },

  async getAccount(ownerId: string): Promise<AdminAccountDetail> {
    const { data } = await api.get<AdminAccountDetail>(
      `/admin/accounts/${encodeURIComponent(ownerId)}`,
    );
    return data;
  },

  async getAccountTeam(
    ownerId: string,
    days: AdminTeamPeriodDays = 30,
  ): Promise<AdminTeam> {
    const { data } = await api.get<AdminTeam>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/team`,
      { params: { days } },
    );
    return data;
  },

  async getAccountActivation(ownerId: string): Promise<AdminAccountActivation> {
    const { data } = await api.get<AdminAccountActivation>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/activation`,
    );
    return data;
  },

  async getAccountSubscription(
    ownerId: string,
  ): Promise<AdminAccountSubscription> {
    const { data } = await api.get<AdminAccountSubscription>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/subscription`,
    );
    return data;
  },

  async extendTrial(
    ownerId: string,
    payload: ExtendTrialPayload,
  ): Promise<AdminSubscriptionActionResult> {
    const { data } = await api.post<AdminSubscriptionActionResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/subscription/extend-trial`,
      payload,
    );
    return data;
  },

  async grantInternalAccess(
    ownerId: string,
    payload: GrantInternalAccessPayload,
  ): Promise<AdminSubscriptionActionResult> {
    const { data } = await api.post<AdminSubscriptionActionResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/subscription/grant-internal-access`,
      payload,
    );
    return data;
  },

  async revokeInternalAccess(
    ownerId: string,
    payload: Omit<RevokeInternalAccessPayload, "trialDays"> & {
      trialDays?: number;
    },
  ): Promise<AdminSubscriptionActionResult> {
    const { data } = await api.post<AdminSubscriptionActionResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/subscription/revoke-internal-access`,
      payload,
    );
    return data;
  },

  async deactivateAccount(
    ownerId: string,
    payload: AccountStatusPayload,
  ): Promise<AdminAccountStatusResult> {
    const { data } = await api.post<AdminAccountStatusResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/deactivate`,
      payload,
    );
    return data;
  },

  async reactivateAccount(
    ownerId: string,
    payload: AccountStatusPayload,
  ): Promise<AdminAccountStatusResult> {
    const { data } = await api.post<AdminAccountStatusResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/reactivate`,
      payload,
    );
    return data;
  },

  async getMetricsOverview(
    period: AdminMetricsPeriod,
  ): Promise<AdminMetricsOverview> {
    const { data } = await api.get<AdminMetricsOverview>(
      "/admin/metrics/overview",
      { params: { period } },
    );
    return data;
  },

  async getUsage(params: AdminUsageParams = {}): Promise<AdminUsage> {
    const { data } = await api.get<AdminUsage>("/admin/usage", { params });
    return data;
  },

  async getInactiveAccounts(
    days: AdminInactiveDays,
  ): Promise<AdminInactiveAccounts> {
    const { data } = await api.get<AdminInactiveAccounts>(
      "/admin/usage/inactive",
      { params: { days } },
    );
    return data;
  },

  async getAiUsageReport(
    params: AdminAiUsageParams,
  ): Promise<AdminAiUsageRow[]> {
    const { data } = await api.get<AdminAiUsageRow[]>(
      "/admin/ai-usage/report",
      { params },
    );
    return data;
  },

  async getAiEfficiency(
    params: { from?: string; to?: string } = {},
  ): Promise<AdminAiEfficiencyReport> {
    const { data } = await api.get<AdminAiEfficiencyReport>(
      "/admin/ai-efficiency/report",
      { params },
    );
    return data;
  },

  async getErrors(
    params: AdminErrorsParams = {},
  ): Promise<AdminErrorsOverview> {
    const { data } = await api.get<AdminErrorsOverview>("/admin/errors", {
      params,
    });
    return data;
  },

  async getAccountErrors(
    ownerId: string,
    params: AdminErrorsParams = {},
  ): Promise<AdminAccountErrors> {
    const { data } = await api.get<AdminAccountErrors>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/errors`,
      { params },
    );
    return data;
  },

  async getErrorOccurrences(
    fingerprint: string,
    params: AdminErrorOccurrencesParams = {},
  ): Promise<AdminErrorOccurrences> {
    const { data } = await api.get<AdminErrorOccurrences>(
      `/admin/errors/${encodeURIComponent(fingerprint)}/occurrences`,
      { params },
    );
    return data;
  },

  async listNotificationLogs(
    params: NotificationLogListParams = {},
  ): Promise<NotificationLogList> {
    const { data } = await api.get<NotificationLogList>(
      "/admin/notification-logs",
      { params },
    );
    return data;
  },

  async getNotificationLogStats(
    params: NotificationLogStatsParams = {},
  ): Promise<NotificationLogStatsRow[]> {
    const { data } = await api.get<NotificationLogStatsRow[]>(
      "/admin/notification-logs/stats",
      { params },
    );
    return data;
  },

  async listAuditLogs(
    params: AuditLogListParams = {},
  ): Promise<PlatformAuditLogList> {
    const { data } = await api.get<PlatformAuditLogList>("/admin/audit-logs", {
      params,
    });
    return data;
  },

  async listTeam(): Promise<PlatformAdminMember[]> {
    const { data } = await api.get<PlatformAdminMember[]>("/admin/team");
    return data;
  },

  async createTeamMember(
    payload: CreatePlatformAdminPayload,
  ): Promise<PlatformAdminActionResult> {
    const { data } = await api.post<PlatformAdminActionResult>(
      "/admin/team",
      payload,
    );
    return data;
  },

  async revokeTeamMember(
    adminId: string,
    payload: RevokePlatformAdminPayload,
  ): Promise<PlatformAdminActionResult> {
    const { data } = await api.post<PlatformAdminActionResult>(
      `/admin/team/${encodeURIComponent(adminId)}/revoke`,
      payload,
    );
    return data;
  },

  async resetTeamMemberAccess(
    adminId: string,
    payload: ResetPlatformAdminAccessPayload,
  ): Promise<PlatformAdminActionResult> {
    const { data } = await api.post<PlatformAdminActionResult>(
      `/admin/team/${encodeURIComponent(adminId)}/reset-access`,
      payload,
    );
    return data;
  },

  async getNotificationsHealth(): Promise<NotificationsHealth> {
    const { data } = await api.get<NotificationsHealth>(
      "/health/notifications/details",
      {
        validateStatus: (status) => status === 200 || status === 503,
      },
    );
    return data;
  },

  async listSystemJobs(): Promise<SystemJob[]> {
    const { data } = await api.get<SystemJob[]>("/admin/system/jobs");
    return data;
  },

  async runSystemJob(
    key: SystemJobKey,
    reason: string,
  ): Promise<SystemJobRunResult> {
    if (key === "stale_requests") {
      const { data } = await api.post<{ notified: number }>(
        "/admin/check-stale-requests",
        { reason },
      );
      return { key, count: data.notified };
    }
    const { data } = await api.post<{ dispatched: number }>(
      "/admin/send-weekly-summary",
      { reason },
    );
    return { key, count: data.dispatched };
  },

  async getRevenueSummary(month?: string): Promise<AdminRevenueSummary> {
    const { data } = await api.get<AdminRevenueSummary>(
      "/admin/revenue/summary",
      { params: month ? { month } : {} },
    );
    return data;
  },

  async getRevenueForecast(months = 6): Promise<AdminForecast> {
    const { data } = await api.get<AdminForecast>("/admin/revenue/forecast", {
      params: { months },
    });
    return data;
  },

  async listInvoices(
    params: AdminInvoiceListParams = {},
  ): Promise<AdminInvoiceList> {
    const { data } = await api.get<AdminInvoiceList>(
      "/admin/revenue/invoices",
      { params },
    );
    return data;
  },

  async getDelinquency(): Promise<AdminDelinquency> {
    const { data } = await api.get<AdminDelinquency>(
      "/admin/revenue/delinquency",
    );
    return data;
  },

  async listAccountInvoices(
    ownerId: string,
    params: { limit?: number; offset?: number } = {},
  ): Promise<AdminInvoiceList> {
    const { data } = await api.get<AdminInvoiceList>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/invoices`,
      { params },
    );
    return data;
  },

  async listPlans(): Promise<AdminPlan[]> {
    const { data } = await api.get<AdminPlan[]>("/admin/plans");
    return data;
  },

  async listCoupons(): Promise<AdminCouponList> {
    const { data } = await api.get<AdminCouponList>("/admin/coupons");
    return data;
  },

  async createCoupon(
    payload: CreateCouponPayload,
  ): Promise<AdminCouponActionResult> {
    const { data } = await api.post<AdminCouponActionResult>(
      "/admin/coupons",
      payload,
    );
    return data;
  },

  async deactivateCoupon(
    id: string,
    payload: { reason: string },
  ): Promise<AdminCouponActionResult> {
    const { data } = await api.post<AdminCouponActionResult>(
      `/admin/coupons/${encodeURIComponent(id)}/deactivate`,
      payload,
    );
    return data;
  },

  async listCouponRedemptions(id: string): Promise<AdminCouponRedemptions> {
    const { data } = await api.get<AdminCouponRedemptions>(
      `/admin/coupons/${encodeURIComponent(id)}/redemptions`,
    );
    return data;
  },

  async getQueuesOverview(): Promise<AdminQueuesOverview> {
    const { data } = await api.get<AdminQueuesOverview>("/admin/system/queues");
    return data;
  },

  async listFailedJobs(
    params: AdminFailedJobsParams = {},
  ): Promise<AdminFailedJobs> {
    const { data } = await api.get<AdminFailedJobs>(
      "/admin/system/queues/failed",
      { params },
    );
    return data;
  },

  async runQueueJobAction(
    action: AdminQueueJobAction,
    queue: AdminQueueName,
    jobId: string,
    reason: string,
  ): Promise<ApiSchema<"AdminQueueJobActionResultDto">> {
    const { data } = await api.post<ApiSchema<"AdminQueueJobActionResultDto">>(
      `/admin/system/queues/${encodeURIComponent(queue)}/jobs/${encodeURIComponent(jobId)}/${action}`,
      { reason },
    );
    return data;
  },

  async listStripeEvents(
    params: AdminStripeEventsParams = {},
  ): Promise<AdminStripeEvents> {
    const { data } = await api.get<AdminStripeEvents>("/admin/stripe-events", {
      params,
    });
    return data;
  },

  async reprocessStripeEvent(
    id: string,
    reason: string,
  ): Promise<ApiSchema<"ReprocessGatewayEventResultDto">> {
    const { data } = await api.post<
      ApiSchema<"ReprocessGatewayEventResultDto">
    >(`/admin/stripe-events/${encodeURIComponent(id)}/reprocess`, { reason });
    return data;
  },

  async getSecurity(
    days: AdminSecurityPeriodDays = 30,
  ): Promise<AdminSecurityOverview> {
    const { data } = await api.get<AdminSecurityOverview>("/admin/security", {
      params: { days },
    });
    return data;
  },

  async getAccountSecurity(
    ownerId: string,
    days: AdminSecurityPeriodDays = 30,
  ): Promise<AdminAccountSecurity> {
    const { data } = await api.get<AdminAccountSecurity>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/security`,
      { params: { days } },
    );
    return data;
  },

  async getAccountSecurityLogs(
    ownerId: string,
    days: AdminSecurityPeriodDays = 30,
  ): Promise<AdminAccountSecurityLogs> {
    const { data } = await api.get<AdminAccountSecurityLogs>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/security/logs`,
      { params: { days } },
    );
    return data;
  },

  async getAccountClinicalAccess(
    ownerId: string,
    days: AdminClinicalAccessDays = 30,
  ): Promise<AdminClinicalAccess> {
    const { data } = await api.get<AdminClinicalAccess>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/clinical-access`,
      { params: { days } },
    );
    return data;
  },

  async exportAccountClinicalAccess(
    ownerId: string,
    days: AdminClinicalAccessDays,
    reason: string,
  ): Promise<AdminClinicalAccessExport> {
    const { data } = await api.post<AdminClinicalAccessExport>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/clinical-access/export`,
      { days, reason },
    );
    return data;
  },

  async getAccountClinicalAccessPatient(
    ownerId: string,
    input: { patient: string; days: AdminClinicalAccessDays; reason: string },
  ): Promise<AdminClinicalAccessPatientResult> {
    const { data } = await api.post<AdminClinicalAccessPatientResult>(
      `/admin/accounts/${encodeURIComponent(ownerId)}/clinical-access/patient`,
      input,
    );
    return data;
  },
};
