import api from "@/lib/api";
import type {
  AccountStatementDto,
  AppointmentFinanceStatusDto,
  CancelReceivablePayload,
  CashMovementPayload,
  CashSessionListParams,
  CashSessionListResponse,
  CashSessionSummaryDto,
  CloseCashSessionPayload,
  CreateFinancialAccountPayload,
  CreateReceivableFromAppointmentPayload,
  CreateReceivablePayload,
  CreateRefundPayload,
  CreateServicePricePayload,
  CreateTransferPayload,
  CurrentCashSessionResponse,
  FinanceProfessionalDto,
  FinancialAccountDto,
  OpenCashSessionPayload,
  OpenReportDto,
  OpenReportParams,
  PatientFinanceSummaryDto,
  PaymentListParams,
  PaymentListResponse,
  PaymentMethod,
  PaymentMethodConfigDto,
  PeriodParams,
  ProductionReportDto,
  ReceiptPreviewDto,
  ReceiptsReportDto,
  ReceiptsReportParams,
  ReceivableDetailDto,
  ReceivableItemPayload,
  ReceivableListParams,
  ReceivableListResponse,
  RegisterPaymentPayload,
  ResolveServicePriceParams,
  ResolvedServicePriceDto,
  ServicePriceDto,
  TransferResponse,
  UpdateFinancialAccountPayload,
  UpdatePaymentMethodConfigPayload,
  UpdateServicePricePayload,
} from "@/types/finance.types";

const CSV = { format: "csv" } as const;

function semVazios<T extends object>(params?: T): Partial<T> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor !== "",
    ),
  ) as Partial<T>;
}

async function baixarCsv(url: string, params?: object): Promise<Blob> {
  const response = await api.get<Blob>(url, {
    params: { ...semVazios(params), ...CSV },
    responseType: "blob",
  });
  return response.data;
}

export const financeService = {
  async listAccounts(includeInactive = false): Promise<FinancialAccountDto[]> {
    const response = await api.get<FinancialAccountDto[]>("/finance/accounts", {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return response.data;
  },

  async createAccount(
    payload: CreateFinancialAccountPayload,
  ): Promise<FinancialAccountDto> {
    const response = await api.post<FinancialAccountDto>(
      "/finance/accounts",
      payload,
    );
    return response.data;
  },

  async updateAccount(
    id: string,
    payload: UpdateFinancialAccountPayload,
  ): Promise<FinancialAccountDto> {
    const response = await api.patch<FinancialAccountDto>(
      `/finance/accounts/${id}`,
      payload,
    );
    return response.data;
  },

  async setAccountStatus(
    id: string,
    active: boolean,
  ): Promise<FinancialAccountDto> {
    const response = await api.patch<FinancialAccountDto>(
      `/finance/accounts/${id}/status`,
      { active },
    );
    return response.data;
  },

  async listProfessionals(): Promise<FinanceProfessionalDto[]> {
    const response = await api.get<FinanceProfessionalDto[]>(
      "/finance/professionals",
    );
    return response.data;
  },

  async listPaymentMethods(): Promise<PaymentMethodConfigDto[]> {
    const response = await api.get<PaymentMethodConfigDto[]>(
      "/finance/payment-methods",
    );
    return response.data;
  },

  async updatePaymentMethod(
    method: PaymentMethod,
    payload: UpdatePaymentMethodConfigPayload,
  ): Promise<PaymentMethodConfigDto> {
    const response = await api.put<PaymentMethodConfigDto>(
      `/finance/payment-methods/${method}`,
      payload,
    );
    return response.data;
  },

  async listReceivables(
    params: ReceivableListParams = {},
  ): Promise<ReceivableListResponse> {
    const response = await api.get<ReceivableListResponse>(
      "/finance/receivables",
      { params: semVazios(params) },
    );
    return response.data;
  },

  async getReceivable(id: string): Promise<ReceivableDetailDto> {
    const response = await api.get<ReceivableDetailDto>(
      `/finance/receivables/${id}`,
    );
    return response.data;
  },

  async createReceivable(
    payload: CreateReceivablePayload,
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      "/finance/receivables",
      payload,
    );
    return response.data;
  },

  async createReceivableFromAppointment(
    appointmentId: string,
    payload: CreateReceivableFromAppointmentPayload = {},
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      `/finance/receivables/from-appointment/${appointmentId}`,
      payload,
    );
    return response.data;
  },

  async addReceivableItem(
    receivableId: string,
    item: ReceivableItemPayload,
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      `/finance/receivables/${receivableId}/items`,
      { item },
    );
    return response.data;
  },

  async cancelReceivableItem(
    receivableId: string,
    itemId: string,
  ): Promise<ReceivableDetailDto> {
    const response = await api.delete<ReceivableDetailDto>(
      `/finance/receivables/${receivableId}/items/${itemId}`,
    );
    return response.data;
  },

  async cancelReceivable(
    receivableId: string,
    payload: CancelReceivablePayload,
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      `/finance/receivables/${receivableId}/cancel`,
      payload,
    );
    return response.data;
  },

  async registerPayment(
    receivableId: string,
    payload: RegisterPaymentPayload,
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      `/finance/receivables/${receivableId}/payments`,
      payload,
    );
    return response.data;
  },

  async refundPayment(
    paymentId: string,
    payload: CreateRefundPayload,
  ): Promise<ReceivableDetailDto> {
    const response = await api.post<ReceivableDetailDto>(
      `/finance/payments/${paymentId}/refunds`,
      payload,
    );
    return response.data;
  },

  async listPayments(
    params: PaymentListParams = {},
  ): Promise<PaymentListResponse> {
    const response = await api.get<PaymentListResponse>("/finance/payments", {
      params: semVazios(params),
    });
    return response.data;
  },

  async getPatientSummary(
    patientId: string,
  ): Promise<PatientFinanceSummaryDto> {
    const response = await api.get<PatientFinanceSummaryDto>(
      `/finance/patients/${patientId}/summary`,
    );
    return response.data;
  },

  async getAppointmentsStatus(
    appointmentIds: string[],
  ): Promise<AppointmentFinanceStatusDto[]> {
    if (appointmentIds.length === 0) return [];
    const response = await api.get<AppointmentFinanceStatusDto[]>(
      "/finance/appointments/status",
      { params: { ids: appointmentIds.join(",") } },
    );
    return response.data;
  },

  async getCurrentCashSession(): Promise<CurrentCashSessionResponse> {
    const response = await api.get<CurrentCashSessionResponse>(
      "/finance/cash-sessions/current",
    );
    return response.data;
  },

  async openCashSession(
    payload: OpenCashSessionPayload,
  ): Promise<CashSessionSummaryDto> {
    const response = await api.post<CashSessionSummaryDto>(
      "/finance/cash-sessions",
      payload,
    );
    return response.data;
  },

  async withdrawFromCashSession(
    payload: CashMovementPayload,
  ): Promise<CashSessionSummaryDto> {
    const response = await api.post<CashSessionSummaryDto>(
      "/finance/cash-sessions/current/withdrawals",
      payload,
    );
    return response.data;
  },

  async supplyCashSession(
    payload: CashMovementPayload,
  ): Promise<CashSessionSummaryDto> {
    const response = await api.post<CashSessionSummaryDto>(
      "/finance/cash-sessions/current/supplies",
      payload,
    );
    return response.data;
  },

  async closeCurrentCashSession(
    payload: CloseCashSessionPayload,
  ): Promise<CashSessionSummaryDto> {
    const response = await api.post<CashSessionSummaryDto>(
      "/finance/cash-sessions/current/close",
      payload,
    );
    return response.data;
  },

  async listCashSessions(
    params: CashSessionListParams = {},
  ): Promise<CashSessionListResponse> {
    const response = await api.get<CashSessionListResponse>(
      "/finance/cash-sessions",
      { params: semVazios(params) },
    );
    return response.data;
  },

  async getCashSession(id: string): Promise<CashSessionSummaryDto> {
    const response = await api.get<CashSessionSummaryDto>(
      `/finance/cash-sessions/${id}`,
    );
    return response.data;
  },

  async closeCashSession(
    id: string,
    payload: CloseCashSessionPayload,
  ): Promise<CashSessionSummaryDto> {
    const response = await api.post<CashSessionSummaryDto>(
      `/finance/cash-sessions/${id}/close`,
      payload,
    );
    return response.data;
  },

  async createTransfer(
    payload: CreateTransferPayload,
  ): Promise<TransferResponse> {
    const response = await api.post<TransferResponse>(
      "/finance/transfers",
      payload,
    );
    return response.data;
  },

  async listServicePrices(): Promise<ServicePriceDto[]> {
    const response = await api.get<ServicePriceDto[]>(
      "/finance/service-prices",
    );
    return response.data;
  },

  async createServicePrice(
    payload: CreateServicePricePayload,
  ): Promise<ServicePriceDto> {
    const response = await api.post<ServicePriceDto>(
      "/finance/service-prices",
      payload,
    );
    return response.data;
  },

  async updateServicePrice(
    id: string,
    payload: UpdateServicePricePayload,
  ): Promise<ServicePriceDto> {
    const response = await api.patch<ServicePriceDto>(
      `/finance/service-prices/${id}`,
      payload,
    );
    return response.data;
  },

  async deleteServicePrice(id: string): Promise<void> {
    await api.delete(`/finance/service-prices/${id}`);
  },

  async resolveServicePrice(
    params: ResolveServicePriceParams,
  ): Promise<ResolvedServicePriceDto> {
    const response = await api.get<ResolvedServicePriceDto>(
      "/finance/service-prices/resolve",
      { params: semVazios(params) },
    );
    return response.data;
  },

  async getReceiptsReport(
    params: ReceiptsReportParams,
  ): Promise<ReceiptsReportDto> {
    const response = await api.get<ReceiptsReportDto>(
      "/finance/reports/receipts",
      { params: semVazios(params) },
    );
    return response.data;
  },

  exportReceiptsReportCsv(params: ReceiptsReportParams): Promise<Blob> {
    return baixarCsv("/finance/reports/receipts", params);
  },

  async getProductionReport(
    params: PeriodParams,
  ): Promise<ProductionReportDto> {
    const response = await api.get<ProductionReportDto>(
      "/finance/reports/production",
      { params: semVazios(params) },
    );
    return response.data;
  },

  exportProductionReportCsv(params: PeriodParams): Promise<Blob> {
    return baixarCsv("/finance/reports/production", params);
  },

  async getOpenReport(params: OpenReportParams): Promise<OpenReportDto> {
    const response = await api.get<OpenReportDto>("/finance/reports/open", {
      params: semVazios(params),
    });
    return response.data;
  },

  exportOpenReportCsv(params: OpenReportParams): Promise<Blob> {
    return baixarCsv("/finance/reports/open", params);
  },

  async getAccountStatement(
    accountId: string,
    params: PeriodParams,
  ): Promise<AccountStatementDto> {
    const response = await api.get<AccountStatementDto>(
      `/finance/accounts/${accountId}/statement`,
      { params: semVazios(params) },
    );
    return response.data;
  },

  exportAccountStatementCsv(
    accountId: string,
    params: PeriodParams,
  ): Promise<Blob> {
    return baixarCsv(`/finance/accounts/${accountId}/statement`, params);
  },

  async getCashSessionReport(id: string): Promise<CashSessionSummaryDto> {
    const response = await api.get<CashSessionSummaryDto>(
      `/finance/cash-sessions/${id}/report`,
    );
    return response.data;
  },

  exportCashSessionReportCsv(id: string): Promise<Blob> {
    return baixarCsv(`/finance/cash-sessions/${id}/report`);
  },

  async getPaymentReceiptPdf(paymentId: string): Promise<Blob> {
    const response = await api.get<Blob>(
      `/finance/payments/${paymentId}/receipt`,
      { responseType: "blob" },
    );
    return response.data;
  },

  async getPaymentReceiptPreview(paymentId: string): Promise<string> {
    const response = await api.get<ReceiptPreviewDto>(
      `/finance/payments/${paymentId}/receipt/preview`,
    );
    return response.data.html;
  },
};
