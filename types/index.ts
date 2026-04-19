// ─── Doctor Profile ───────────────────────────────────────────────────────────

export interface DoctorProfile {
  id: string;
  user_id: string;
  crm: string;
  crm_state: string;
  specialty?: string;
  signature_url?: string;
  clinic_name?: string;
  clinic_cnpj?: string;
  clinic_address?: string;
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
  account_id: string;
  avatar_url?: string | null;
  is_doctor: boolean;
  doctor_profile?: DoctorProfile;
  subscription_plan_id?: string;
  admin_id?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── User Doctor Access ───────────────────────────────────────────────────────

export interface UserDoctorAccess {
  id: string;
  user_id: string;
  doctor_user_id: string;
  status: "active" | "inactive";
  doctor: { id: string; name: string; crm: string; specialty?: string };
}

// ─── Available Doctor ─────────────────────────────────────────────────────────

export interface AvailableDoctor {
  id: string;
  name: string;
  crm: string;
  crm_state: string;
  specialty?: string;
}

// ─── Doctor Summary (tipo canônico para médicos) ─────────────────────────────

export interface DoctorSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  avatarColor?: string;
  doctor_profile?: DoctorProfile;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  is_doctor?: boolean;
  crm?: string;
  crm_state?: string;
  specialty?: string;
  subscription_plan_id?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  max_doctors: number;
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
