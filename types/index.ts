// User types
export interface User {
  id: string;
  name: string;
  email: string;
  cpf: string;
  accessLevel: number;
  status: number;
  createdAt: string;
  updatedAt: string;
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
}

export interface AuthResponse {
  access_token: string;
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
  cnpj: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
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
  cnpj: string;
  phone: string;
  email: string;
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
