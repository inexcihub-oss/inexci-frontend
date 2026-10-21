export type Money = string;

export interface FinanceRef {
  id: string;
  name: string;
}

export enum FinancialAccountType {
  CASH_DRAWER = "cash_drawer",
  BANK = "bank",
  CARD_CREDIT = "card_credit",
  CARD_DEBIT = "card_debit",
  OTHER = "other",
}

export enum PaymentMethod {
  CASH = "cash",
  PIX = "pix",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  BANK_TRANSFER = "bank_transfer",
  BOLETO = "boleto",
  CHECK = "check",
  OTHER = "other",
}

export enum ReceivableStatus {
  OPEN = "open",
  PARTIAL = "partial",
  PAID = "paid",
  CANCELLED = "cancelled",
}

export enum FinancialEntryDirection {
  IN = "in",
  OUT = "out",
}

export enum FinancialEntryKind {
  PAYMENT = "payment",
  REFUND = "refund",
  WITHDRAWAL = "withdrawal",
  SUPPLY = "supply",
  SESSION_CLOSING = "session_closing",
  TRANSFER = "transfer",
  ADJUSTMENT = "adjustment",
}

export enum RefundReason {
  DUPLICATE_ENTRY = "duplicate_entry",
  WRONG_AMOUNT = "wrong_amount",
  WRONG_PAYMENT_METHOD = "wrong_payment_method",
  WRONG_PATIENT = "wrong_patient",
  SERVICE_NOT_PERFORMED = "service_not_performed",
  UNDUE_CHARGE = "undue_charge",
  PATIENT_REQUEST = "patient_request",
  COURTESY_DISCOUNT = "courtesy_discount",
  SERVICE_CHANGE = "service_change",
  SWITCHED_TO_HEALTH_PLAN = "switched_to_health_plan",
  PATIENT_RESCHEDULING = "patient_rescheduling",
  FUTURE_CREDIT = "future_credit",
  OTHER = "other",
}

export type FinanceAppointmentType = "first_visit" | "return" | "follow_up";

export type ReceiptsGroupBy = "day" | "month" | "method" | "account" | "user";

export const FINANCIAL_ACCOUNT_TYPES: FinancialAccountType[] = [
  FinancialAccountType.CASH_DRAWER,
  FinancialAccountType.BANK,
  FinancialAccountType.CARD_CREDIT,
  FinancialAccountType.CARD_DEBIT,
  FinancialAccountType.OTHER,
];

export const FINANCIAL_ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, string> =
  {
    [FinancialAccountType.CASH_DRAWER]: "Caixa físico",
    [FinancialAccountType.BANK]: "Conta bancária",
    [FinancialAccountType.CARD_CREDIT]: "Cartão de crédito",
    [FinancialAccountType.CARD_DEBIT]: "Cartão de débito",
    [FinancialAccountType.OTHER]: "Outra",
  };

export const PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.PIX,
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.BOLETO,
  PaymentMethod.CHECK,
  PaymentMethod.OTHER,
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CREDIT_CARD]: "Cartão de crédito",
  [PaymentMethod.DEBIT_CARD]: "Cartão de débito",
  [PaymentMethod.BANK_TRANSFER]: "Transferência bancária",
  [PaymentMethod.BOLETO]: "Boleto",
  [PaymentMethod.CHECK]: "Cheque",
  [PaymentMethod.OTHER]: "Outra",
};

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  [ReceivableStatus.OPEN]: "Em aberto",
  [ReceivableStatus.PARTIAL]: "Parcial",
  [ReceivableStatus.PAID]: "Pago",
  [ReceivableStatus.CANCELLED]: "Cancelada",
};

export const FINANCIAL_ENTRY_DIRECTION_LABELS: Record<
  FinancialEntryDirection,
  string
> = {
  [FinancialEntryDirection.IN]: "Entrada",
  [FinancialEntryDirection.OUT]: "Saída",
};

export const FINANCIAL_ENTRY_KIND_LABELS: Record<FinancialEntryKind, string> = {
  [FinancialEntryKind.PAYMENT]: "Recebimento",
  [FinancialEntryKind.REFUND]: "Estorno",
  [FinancialEntryKind.WITHDRAWAL]: "Retirada",
  [FinancialEntryKind.SUPPLY]: "Suprimento",
  [FinancialEntryKind.SESSION_CLOSING]: "Fechamento de caixa",
  [FinancialEntryKind.TRANSFER]: "Transferência",
  [FinancialEntryKind.ADJUSTMENT]: "Ajuste",
};

export const REFUND_REASONS: RefundReason[] = [
  RefundReason.DUPLICATE_ENTRY,
  RefundReason.WRONG_AMOUNT,
  RefundReason.WRONG_PAYMENT_METHOD,
  RefundReason.WRONG_PATIENT,
  RefundReason.SERVICE_NOT_PERFORMED,
  RefundReason.UNDUE_CHARGE,
  RefundReason.PATIENT_REQUEST,
  RefundReason.COURTESY_DISCOUNT,
  RefundReason.SERVICE_CHANGE,
  RefundReason.SWITCHED_TO_HEALTH_PLAN,
  RefundReason.PATIENT_RESCHEDULING,
  RefundReason.FUTURE_CREDIT,
  RefundReason.OTHER,
];

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  [RefundReason.DUPLICATE_ENTRY]: "Lançamento duplicado",
  [RefundReason.WRONG_AMOUNT]: "Erro no valor lançado",
  [RefundReason.WRONG_PAYMENT_METHOD]: "Erro na forma de pagamento",
  [RefundReason.WRONG_PATIENT]: "Paciente errado",
  [RefundReason.SERVICE_NOT_PERFORMED]: "Procedimento ou exame não realizado",
  [RefundReason.UNDUE_CHARGE]: "Cobrança indevida",
  [RefundReason.PATIENT_REQUEST]: "Solicitação do paciente",
  [RefundReason.COURTESY_DISCOUNT]: "Cortesia ou desconto comercial",
  [RefundReason.SERVICE_CHANGE]: "Troca de procedimento, exame ou especialidade",
  [RefundReason.SWITCHED_TO_HEALTH_PLAN]: "Atendimento virou convênio ou plano",
  [RefundReason.PATIENT_RESCHEDULING]: "Paciente cancelou e vai remarcar",
  [RefundReason.FUTURE_CREDIT]: "Crédito intencional para uso futuro",
  [RefundReason.OTHER]: "Outro motivo",
};

export const RECEIPTS_GROUP_BY_LABELS: Record<ReceiptsGroupBy, string> = {
  day: "Dia",
  month: "Mês",
  method: "Forma de pagamento",
  account: "Conta",
  user: "Usuário",
};

export const MAX_CREDIT_INSTALLMENTS = 24;

export interface FinancialAccountDto {
  id: string;
  name: string;
  type: FinancialAccountType;
  active: boolean;
  notes: string | null;
  createdAt: string;
}

export interface CreateFinancialAccountPayload {
  name: string;
  type: FinancialAccountType;
  notes?: string;
}

export type UpdateFinancialAccountPayload =
  Partial<CreateFinancialAccountPayload>;

export interface PaymentMethodConfigDto {
  method: PaymentMethod;
  active: boolean;
  defaultAccountId: string | null;
  defaultAccount: FinanceRef | null;
  maxInstallments: number;
}

export interface UpdatePaymentMethodConfigPayload {
  active: boolean;
  defaultAccountId: string | null;
  maxInstallments: number;
}

export interface ReceivableListItemDto {
  id: string;
  patient: FinanceRef;
  appointmentId: string | null;
  referenceDate: string;
  dueDate: string | null;
  totalAmount: Money;
  paidAmount: Money;
  balance: Money;
  status: ReceivableStatus;
  description: string;
  createdAt: string;
}

export interface ReceivableItemDto {
  id: string;
  description: string;
  executedBy: FinanceRef | null;
  executedAt: string | null;
  appointmentId: string | null;
  quantity: number;
  unitAmount: Money;
  discount: Money;
  surcharge: Money;
  total: Money;
  cancelledAt: string | null;
}

export interface RefundDto {
  id: string;
  amount: Money;
  reason: RefundReason;
  notes: string | null;
  createdAt: string;
  refundedBy: FinanceRef | null;
}

export interface ReceivablePaymentDto {
  id: string;
  method: PaymentMethod;
  amount: Money;
  refundedAmount: Money;
  paidAt: string;
  account: FinanceRef | null;
  cashSessionId: string | null;
  receivedBy: FinanceRef | null;
  cardBrand: string | null;
  installments: number | null;
  nsu: string | null;
  authorizationCode: string | null;
  notes: string | null;
  refunds: RefundDto[];
}

export interface ReceivableDetailDto extends ReceivableListItemDto {
  notes: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  cancelledBy: FinanceRef | null;
  createdBy: FinanceRef | null;
  items: ReceivableItemDto[];
  payments: ReceivablePaymentDto[];
}

export interface ReceivableListParams {
  status?: ReceivableStatus;
  from?: string;
  to?: string;
  patientId?: string;
  executedById?: string;
  page?: number;
  limit?: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ReceivableListResponse
  extends Paginated<ReceivableListItemDto> {
  totalOpenAmount: Money;
}

export interface ReceivableItemPayload {
  description: string;
  executedById?: string;
  executedAt?: string;
  appointmentId?: string;
  quantity?: number;
  unitAmount: Money;
  discount?: Money;
  surcharge?: Money;
}

export interface CreateReceivablePayload {
  patientId: string;
  appointmentId?: string;
  referenceDate?: string;
  dueDate?: string;
  notes?: string;
  items: ReceivableItemPayload[];
}

export interface CreateReceivableFromAppointmentPayload {
  allowHealthPlan?: boolean;
  unitAmount?: Money;
}

export interface FinanceProfessionalDto {
  id: string;
  name: string;
  council: string;
  registry: string | null;
}

export interface CancelReceivablePayload {
  reason: string;
}

export interface PaymentLinePayload {
  method: PaymentMethod;
  amount: Money;
  accountId?: string;
  installments?: number;
  cardBrand?: string;
  nsu?: string;
  authorizationCode?: string;
  notes?: string;
}

export interface RegisterPaymentPayload {
  paidAt?: string;
  idempotencyKey?: string;
  lines: PaymentLinePayload[];
}

export interface CreateRefundPayload {
  amount: Money;
  reason: RefundReason;
  notes?: string;
}

export interface PaymentListParams {
  from?: string;
  to?: string;
  method?: PaymentMethod;
  accountId?: string;
  page?: number;
  limit?: number;
}

export interface PaymentListItemDto {
  id: string;
  receivableId: string;
  patient: FinanceRef;
  method: PaymentMethod;
  amount: Money;
  refundedAmount: Money;
  paidAt: string;
  account: FinanceRef | null;
  receivedBy: FinanceRef | null;
  installments: number | null;
  cardBrand: string | null;
}

export interface PaymentListResponse extends Paginated<PaymentListItemDto> {
  totalAmount: Money;
  totalRefunded: Money;
}

export interface PatientFinanceSummaryDto {
  openAmount: Money;
  receivables: ReceivableListItemDto[];
}

export interface AppointmentFinanceStatusDto {
  appointmentId: string;
  receivableId: string;
  status: ReceivableStatus;
}

export interface CashSessionTotalByMethodDto {
  method: PaymentMethod;
  received: Money;
  refunded: Money;
  net: Money;
}

export interface CashSessionEntryDto {
  id: string;
  direction: FinancialEntryDirection;
  kind: FinancialEntryKind;
  amount: Money;
  occurredAt: string;
  description: string | null;
  paymentId: string | null;
  refundId: string | null;
}

export interface CashSessionSummaryDto {
  id: string;
  user: FinanceRef;
  account: FinanceRef;
  openedAt: string;
  closedAt: string | null;
  openingAmount: Money;
  cashBalance: Money;
  expectedAmount: Money | null;
  countedAmount: Money | null;
  difference: Money | null;
  notes: string | null;
  closedBy: FinanceRef | null;
  totalsByMethod: CashSessionTotalByMethodDto[];
  entries: CashSessionEntryDto[];
}

export interface CurrentCashSessionResponse {
  session: CashSessionSummaryDto | null;
}

export interface OpenCashSessionPayload {
  accountId: string;
  openingAmount: Money;
}

export interface CashMovementPayload {
  amount: Money;
  description: string;
}

export interface CloseCashSessionPayload {
  countedAmount: Money;
  notes?: string;
}

export interface CashSessionListParams {
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CashSessionListItemDto {
  id: string;
  user: FinanceRef;
  account: FinanceRef;
  openedAt: string;
  closedAt: string | null;
  openingAmount: Money;
  expectedAmount: Money | null;
  countedAmount: Money | null;
  difference: Money | null;
}

export type CashSessionListResponse = Paginated<CashSessionListItemDto>;

export interface CreateTransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: Money;
  description?: string;
  occurredAt?: string;
}

export interface TransferResponse {
  outEntryId: string;
  inEntryId: string;
}

export interface ServicePriceDto {
  id: string;
  doctorId: string | null;
  doctor: FinanceRef | null;
  appointmentType: FinanceAppointmentType | null;
  description: string;
  amount: Money;
  active: boolean;
}

export interface CreateServicePricePayload {
  doctorId?: string | null;
  appointmentType?: FinanceAppointmentType | null;
  description: string;
  amount: Money;
  active?: boolean;
}

export type UpdateServicePricePayload = Partial<CreateServicePricePayload>;

export interface ResolveServicePriceParams {
  doctorId?: string;
  type?: FinanceAppointmentType;
}

export interface ResolvedServicePriceDto {
  amount: Money | null;
  servicePriceId: string | null;
}

export interface PeriodParams {
  from: string;
  to: string;
}

export interface ReceiptsReportParams extends PeriodParams {
  groupBy: ReceiptsGroupBy;
}

export interface ReceiptsReportRow {
  key: string;
  label: string;
  received: Money;
  refunded: Money;
  net: Money;
  count: number;
}

export interface ReceiptsReportDto {
  groupBy: ReceiptsGroupBy;
  rows: ReceiptsReportRow[];
  totals: Omit<ReceiptsReportRow, "key" | "label">;
}

export interface ProductionReportRow {
  executedById: string | null;
  name: string;
  items: number;
  billed: Money;
  received: Money;
}

export interface ProductionReportDto {
  rows: ProductionReportRow[];
  totals: { items: number; billed: Money; received: Money };
}

export interface OpenReportParams {
  until: string;
}

export interface OpenReportRow {
  receivableId: string;
  patient: FinanceRef;
  referenceDate: string;
  dueDate: string | null;
  totalAmount: Money;
  paidAmount: Money;
  balance: Money;
  ageDays: number;
}

export interface OpenReportDto {
  rows: OpenReportRow[];
  totals: { count: number; balance: Money };
}

export interface AccountStatementEntry {
  id: string;
  occurredAt: string;
  direction: FinancialEntryDirection;
  kind: FinancialEntryKind;
  amount: Money;
  description: string | null;
  balance: Money;
}

export interface AccountStatementDto {
  account: { id: string; name: string; type: FinancialAccountType };
  openingBalance: Money;
  closingBalance: Money;
  entries: AccountStatementEntry[];
}

export interface ReceiptPreviewDto {
  html: string;
}
