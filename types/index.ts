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

import type { ConsentStatus } from "@/types/consent.types";

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
  /** Embutido no `/auth/me` (item 4.4b) — evita round-trip extra no boot. */
  consents?: ConsentStatus;
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
   * `profissional`, `avancado`, `enterprise`). Quando omitido, usa o
   * plano default (starter — 30 dias grátis sem cartão).
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
  isTrialDefault: boolean;
  gatewayPriceId?: string | null;
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
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  suspendedAt: string | null;
  pastDueSince: string | null;
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
