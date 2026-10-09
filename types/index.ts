import type { ProfessionalCouncil } from "@/lib/professional-council";

export interface DoctorProfile {
  id: string;
  userId: string;
  council?: ProfessionalCouncil;
  crm: string | null;
  crmState: string | null;
  specialty?: string;
  signatureUrl?: string;
  clinicName?: string;
  clinicCnpj?: string;
  clinicAddress?: string;
}

import type { ConsentStatus } from "@/types/consent.types";
import type { OnboardingState } from "@/lib/onboarding/state";
import { Permission } from "@/lib/permissions";

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
  isPhysician?: boolean;
  canIssueClinicalDocuments?: boolean;
  permissions?: Permission[];
  emailVerified?: boolean;
  doctorProfile?: DoctorProfile;
  adminId?: string;
  account?: {
    ownerName: string;
    ownerIsDoctor: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
  consents?: ConsentStatus;
  onboardingState?: OnboardingState;
}

export interface UserDoctorAccess {
  id: string;
  userId: string;
  doctorUserId: string;
  status: "active" | "inactive";
  doctor: { id: string; name: string; crm: string; specialty?: string };
}

export interface AvailableDoctor {
  id: string;
  name: string;
  crm: string | null;
  crmState: string | null;
  specialty?: string;
  council?: ProfessionalCouncil;
  isPhysician?: boolean;
  canIssueClinicalDocuments?: boolean;
  status?: "pending" | "active" | "inactive" | string;
}

export interface DoctorSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor?: string;
  doctorProfile?: DoctorProfile;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
  planSlug?: string;
}

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  billingPeriod: BillingPeriod;
  surgeryRequestQuota: number;
  sortOrder: number;
  isTrialDefault: boolean;
  gatewayPriceId?: string | null;
}

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "suspended" | "canceled";

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

export interface QuotaStatus {
  used: number;
  limit: number;
  isUnlimited: boolean;
  remaining: number | null;
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

export interface Procedure {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

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
