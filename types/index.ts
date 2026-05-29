// ─── Doctor Profile ───────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: string;
  userId: string;
  crm: string;
  crmState: string;
  specialty?: string;
  signatureUrl?: string;
  clinicName?: string;
  clinicCnpj?: string;
  clinicAddress?: string;
}

// ─── User types ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  status: number;
  phone?: string;
  role: "admin" | "collaborator";
  accountId: string;
  avatarUrl?: string | null;
  isDoctor: boolean;
  emailVerified?: boolean;
  doctorProfile?: DoctorProfile;
  adminId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Doctor Access ───────────────────────────────────────────────────────

export interface UserDoctorAccess {
  id: string;
  userId: string;
  doctorUserId: string;
  status: "active" | "inactive";
  doctor: { id: string; name: string; crm: string; specialty?: string };
}

// ─── Available Doctor ─────────────────────────────────────────────────────────

export interface AvailableDoctor {
  id: string;
  name: string;
  crm: string;
  crmState: string;
  specialty?: string;
  status?: "pending" | "active" | "inactive" | string;
}

// ─── Doctor Summary (tipo canônico para médicos) ─────────────────────────────

export interface DoctorSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor?: string;
  doctorProfile?: DoctorProfile;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  /**
   * Campos enviados em camelCase porque o backend usa
   * `forbidNonWhitelisted: true` e o `RegisterDto` declara `isDoctor` /
   * `crmState`. Usar snake_case faz o request retornar 400.
   */
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
  /**
   * Slug do plano selecionado no cadastro (`starter`, `essencial`,
   * `profissional`, `enterprise`, ou `free-trial`). Quando omitido, o
   * backend usa o plano default. Em ambos os casos, a conta começa com
   * 30 dias de trial sem cartão.
   */
  planSlug?: string;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingPeriod: BillingPeriod;
  surgeryRequestQuota: number; // -1 = ilimitado
  sortOrder: number;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "canceled";

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  planId: string;
  nextPlanId: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  suspendedAt: string | null;
  pastDueSince: string | null;
  defaultPaymentMethodId: string | null;
  gatewayProvider: string;
}

export interface QuotaSnapshot {
  used: number;
  limit: number;
  isUnlimited: boolean;
  remaining: number;
  periodStart: string;
  periodEnd: string;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  plan: SubscriptionPlan | null;
  nextPlan: Pick<
    SubscriptionPlan,
    "id" | "slug" | "name" | "priceCents"
  > | null;
  quota: QuotaSnapshot | null;
  daysLeftInTrial: number | null;
  daysUntilSuspension: number | null;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  createdAt: string;
}

export type InvoiceStatus =
  | "pending"
  | "paid"
  | "failed"
  | "overdue"
  | "refunded"
  | "canceled";

export interface Invoice {
  id: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  invoiceUrl: string | null;
  dueDate: string;
  paidAt: string | null;
  failedAt: string | null;
  attemptCount: number;
  periodStart: string;
  periodEnd: string;
  planSnapshot: {
    slug: string;
    name: string;
    priceCents: number;
    surgeryRequestQuota: number;
  } | null;
  createdAt: string;
}

export interface SavePaymentMethodPayload {
  paymentMethodId: string;
  holderName: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

// Surgery Request types
export interface SurgeryRequest {
  id: string;
  patientId: string;
  hospitalId: string;
  status: number;
  requestDate: string;
  surgeryDate?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

// Patient types
export interface Patient {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email?: string;
  healthPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

// Hospital types
export interface Hospital {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

// Procedure types
export interface Procedure {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Health Plan types
export interface HealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
