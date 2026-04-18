// Prioridade como número (conforme backend)
export type PriorityLevel = 1 | 2 | 3 | 4;

// Constantes de prioridade
export const PRIORITY = {
  LOW: 1 as const,
  MEDIUM: 2 as const,
  HIGH: 3 as const,
  URGENT: 4 as const,
};

// Mapeamento de número para label
export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  1: "Baixa",
  2: "Média",
  3: "Alta",
  4: "Urgente",
};

// Mapeamento inverso (opcional, para compatibilidade)
export const PRIORITY_VALUES: Record<string, PriorityLevel> = {
  Baixa: 1,
  Média: 2,
  Alta: 3,
  Urgente: 4,
};

// Status completos da solicitação cirúrgica
export type SurgeryRequestStatus =
  | "Pendente" // 1
  | "Enviada" // 2
  | "Em Análise" // 3
  | "Em Agendamento" // 4
  | "Agendada" // 5
  | "Realizada" // 6
  | "Faturada" // 7
  | "Finalizada" // 8
  | "Encerrada"; // 9

// Interface para pendência
export interface Pendency {
  id: string;
  key: string;
  name?: string;
  description?: string;
  concluded: boolean;
  concluded_at: string | null;
  responsible_type:
    | "collaborator"
    | "patient"
    | "doctor"
    | "hospital"
    | "health_plan"
    | "supplier"
    | null;
  is_optional: boolean;
  is_waiting: boolean;
  status_context: number | null;
  responsible?: {
    id: number;
    name: string;
  };
}

// Resumo de pendências
export interface PendenciesSummary {
  total: number;
  completed: number;
  pending: number;
  waiting: number;
  optional: number;
  canTransition: boolean;
}

// Pendências agrupadas
export interface GroupedPendencies {
  pending: Pendency[];
  completed: Pendency[];
  waiting: Pendency[];
  optional: Pendency[];
}

// ── Sub-tipos de relações ──────────────────────────────────────────────────────

/** Referência genérica a uma entidade relacionada (id + name) */
export interface EntityRef {
  id: string | number;
  name: string;
  [key: string]: unknown;
}

/** Referência ao médico (inclui doctor_profile aninhado) */
export interface DoctorRef extends EntityRef {
  email?: string;
  phone?: string;
  doctor_profile?: {
    crm?: string;
    specialty?: string;
    crm_state?: string;
    signature_url?: string | null;
    [key: string]: unknown;
  } | null;
  signature_url?: string | null;
}

/** Referência ao paciente */
export interface PatientRef extends EntityRef {
  cpf?: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  rg?: string;
  address?: string;
  zip_code?: string;
  cep?: string;
}

/** Referência ao hospital */
export interface HospitalRef extends EntityRef {
  address?: string;
  email?: string;
  phone?: string;
}

/** Referência ao convênio */
export interface HealthPlanRef extends EntityRef {
  email?: string;
  phone?: string;
}

/** Item de procedimento TUSS */
export interface TussItemRef {
  id: string | number;
  description?: string;
  name?: string;
  code?: string;
  tuss_code?: string;
  quantity?: number;
  authorized?: boolean | null;
  authorized_quantity?: number | null;
  [key: string]: unknown;
}

/** Item OPME */
export interface OpmeItemRef {
  id: string | number;
  name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  authorized?: boolean | null;
  authorized_quantity?: number | null;
  brand?: string;
  distributor?: string;
  [key: string]: unknown;
}

/** Dados de faturamento */
export interface BillingInfo {
  invoice_value: number | null;
  invoice_protocol: string | null;
  invoice_sent_at: string | null;
  payment_deadline: string | null;
  [key: string]: unknown;
}

/** Dados de recebimento */
export interface ReceiptInfo {
  received_value: number;
  received_at: string | null;
  receipt_notes: string | null;
  is_contested: boolean;
  contested_received_value: number | null;
  contested_received_at: string | null;
  [key: string]: unknown;
}

/** Dados de agendamento */
export interface SchedulingInfo {
  date_options?: string[];
  confirmed_date?: string | null;
  [key: string]: unknown;
}

// Re-exporta DoctorSummary como Doctor para manter compatibilidade
export type { DoctorSummary as Doctor } from "@/types";
import type { DoctorSummary } from "@/types";

// Tipo interno para uso em SurgeryRequest (resolve o import)
type Doctor = DoctorSummary;

export interface Patient {
  id: string;
  name: string;
  initials?: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface SurgeryRequest {
  id: string;
  protocol?: string; // Protocolo numérico de 6 dígitos
  patient: Patient;
  procedureName: string;
  doctor: Doctor;
  priority: PriorityLevel;
  pendenciesCount: number;
  pendenciesCompleted?: number;
  pendenciesWaiting?: number;
  createdAt: string;
  deadline: string;
  status: SurgeryRequestStatus;
  topPendencies?: Pendency[]; // Preview das principais pendências
  healthPlan?: string; // Convênio
  hasIncompletePayment?: boolean; // Recebimento incompleto
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: SurgeryRequestStatus;
  cards: SurgeryRequest[];
}
