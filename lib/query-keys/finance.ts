import type {
  CashSessionListParams,
  OpenReportParams,
  PaymentListParams,
  PeriodParams,
  ReceiptsReportParams,
  ReceivableListParams,
  ResolveServicePriceParams,
} from "@/types/finance.types";

const ALL = ["finance"] as const;

export const financeKeys = {
  all: ALL,
  accounts: () => [...ALL, "accounts"] as const,
  accountList: (includeInactive: boolean) =>
    [...ALL, "accounts", "list", includeInactive] as const,
  paymentMethods: () => [...ALL, "payment-methods"] as const,
  professionals: () => [...ALL, "professionals"] as const,
  receivables: () => [...ALL, "receivables"] as const,
  receivableList: (params: ReceivableListParams = {}) =>
    [...ALL, "receivables", "list", params] as const,
  receivable: (id: string) => [...ALL, "receivables", "detail", id] as const,
  payments: () => [...ALL, "payments"] as const,
  paymentList: (params: PaymentListParams = {}) =>
    [...ALL, "payments", "list", params] as const,
  receiptPreview: (paymentId: string) =>
    [...ALL, "payments", "receipt-preview", paymentId] as const,
  patientSummaries: () => [...ALL, "patient-summary"] as const,
  patientSummary: (patientId: string) =>
    [...ALL, "patient-summary", patientId] as const,
  appointmentStatuses: () => [...ALL, "appointment-status"] as const,
  appointmentStatus: (appointmentIds: string[]) =>
    [
      ...ALL,
      "appointment-status",
      [...appointmentIds].sort().join(","),
    ] as const,
  cash: () => [...ALL, "cash-sessions"] as const,
  currentCashSession: () => [...ALL, "cash-sessions", "current"] as const,
  cashSessionList: (params: CashSessionListParams = {}) =>
    [...ALL, "cash-sessions", "list", params] as const,
  cashSession: (id: string) => [...ALL, "cash-sessions", "detail", id] as const,
  cashSessionReport: (id: string) =>
    [...ALL, "cash-sessions", "report", id] as const,
  servicePrices: () => [...ALL, "service-prices"] as const,
  resolvedServicePrice: (params: ResolveServicePriceParams) =>
    [
      ...ALL,
      "service-prices",
      "resolve",
      params.doctorId ?? null,
      params.type ?? null,
    ] as const,
  reports: () => [...ALL, "reports"] as const,
  receiptsReport: (params: ReceiptsReportParams) =>
    [...ALL, "reports", "receipts", params] as const,
  productionReport: (params: PeriodParams) =>
    [...ALL, "reports", "production", params] as const,
  openReport: (params: OpenReportParams) =>
    [...ALL, "reports", "open", params] as const,
  accountStatement: (accountId: string, params: PeriodParams) =>
    [...ALL, "reports", "statement", accountId, params] as const,
};
