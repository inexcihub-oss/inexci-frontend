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
  concludedAt: string | null;
  responsibleType:
    | "collaborator"
    | "patient"
    | "doctor"
    | "hospital"
    | "health_plan"
    | "supplier"
    | null;
  isOptional: boolean;
  isWaiting: boolean;
  statusContext: number | null;
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

/** Referência ao médico (inclui doctorProfile aninhado) */
export interface DoctorRef extends EntityRef {
  email?: string;
  phone?: string;
  doctorProfile?: {
    crm?: string;
    specialty?: string;
    crmState?: string;
    signatureUrl?: string | null;
    header?: {
      id?: string;
      logoUrl?: string | null;
      logoPosition?: "left" | "center" | "right";
      contentHtml?: string | null;
    } | null;
    [key: string]: unknown;
  } | null;
  signatureUrl?: string | null;
}

/** Referência ao paciente */
export interface PatientRef extends EntityRef {
  cpf?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  rg?: string;
  healthPlanNumber?: string;
  address?: string;
  zipCode?: string;
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
  defaultPaymentDays?: number | null;
}

/** Item de procedimento TUSS */
export interface TussItemRef {
  id: string | number;
  description?: string;
  name?: string;
  code?: string;
  tussCode?: string;
  quantity?: number;
  authorized?: boolean | null;
  authorizedQuantity?: number | null;
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
  authorizedQuantity?: number | null;
  selectedSupplierId?: string | null;
  selectedSupplier?: {
    id?: string | number;
    name?: string;
  } | null;
  suppliers?: Array<{
    id?: string | number;
    name?: string;
  }>;
  manufacturers?: Array<{
    id?: string | number;
    name?: string;
  }>;
  [key: string]: unknown;
}

/** Dados de faturamento */
export interface BillingInfo {
  invoiceValue: number | null;
  invoiceProtocol: string | null;
  invoiceSentAt: string | null;
  invoiceNotes: string | null;
  paymentDeadline: string | null;
  [key: string]: unknown;
}

/** Dados de recebimento */
export interface ReceiptInfo {
  receivedValue: number;
  receivedAt: string | null;
  receiptNotes: string | null;
  isContested: boolean;
  contestedReceivedValue: number | null;
  contestedReceivedAt: string | null;
  [key: string]: unknown;
}

/** Dados de agendamento */
export interface SchedulingInfo {
  dateOptions?: string[];
  confirmedDate?: string | null;
  selectedDateIndex?: number | null;
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
  /** Data formatada da última movimentação/atualização (exibição e ordenação). */
  lastActivityAt: string;
  lastStatusChangedAt?: string;
  updatedAt?: string;
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

// ── Criação de SC via documento ──────────────────────────────────────────────

export type DocumentClassificationKind =
  | "surgery_request"
  | "medical_report"
  | "identity_document"
  | "invoice"
  | "exam_result"
  | "additional_document"
  | "unknown";

export interface ExtractedTussItem {
  code: string;
  description?: string;
  qty?: number;
}

export interface ExtractedOpmeItem {
  description: string;
  qty?: number;
  supplier?: string;
  manufacturer?: string;
}

export interface ExtractedPatient {
  name?: string;
  cpf?: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  rg?: string;
  /** Logradouro (rua/avenida), sem número/complemento/bairro/cidade/UF. */
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ExtractedReportSection {
  title: string;
  description: string;
}

export interface ExtractedFromDocument {
  patient?: ExtractedPatient;
  hospital?: string;
  healthPlan?: { name?: string; planId?: string };
  diagnosis?: string;
  suggestedProcedureName?: string;
  reportSections?: ExtractedReportSection[];
  laudoText?: string;
  doctorCRM?: string;
  tuss?: ExtractedTussItem[];
  cid?: string[];
  opme?: ExtractedOpmeItem[];
  suggestedSuppliers?: string[];
}

export interface DocumentEntityCandidate {
  id: string;
  name: string;
  cpf?: string;
}

export interface ExtractFromDocumentCandidates {
  patient: DocumentEntityCandidate[];
  hospital: DocumentEntityCandidate[];
  healthPlan: DocumentEntityCandidate[];
  procedure: DocumentEntityCandidate[];
}

export interface ExtractFromDocumentResponse {
  kind: DocumentClassificationKind;
  confidence: number;
  extracted: ExtractedFromDocument;
  suggestedDocumentType: string;
  ambiguity?: string;
  patientCpfMissing: boolean;
  patientMatchedByCpf: boolean;
  candidates: ExtractFromDocumentCandidates;
  tempStoragePath: string;
  /** Nome original do arquivo enviado (preenchido no frontend após upload) */
  originalFileName?: string;
}

export interface TussItemFromDocument {
  tussCode: string;
  name?: string;
  quantity?: number;
}

export interface OpmeItemFromDocument {
  description: string;
  qty?: number;
  supplier?: string;
  manufacturer?: string;
}

export interface NewPatientFromDocument {
  name: string;
  cpf: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  healthPlanNumber?: string;
}

export interface ReportSectionFromDocument {
  title: string;
  description?: string;
}

export interface CreateFromDocumentPayload {
  doctorId: string;
  patientId?: string;
  newPatient?: NewPatientFromDocument;
  procedureId?: string;
  procedureName?: string;
  hospitalId?: string;
  hospitalName?: string;
  healthPlanId?: string;
  healthPlanName?: string;
  healthPlanNumber?: string;
  priority?: 1 | 2 | 3 | 4;
  notes?: string;
  sections?: ReportSectionFromDocument[];
  tussItems?: TussItemFromDocument[];
  opmeItems?: OpmeItemFromDocument[];
  suggestedSuppliers?: string[];
  tempStoragePath?: string;
  originalFileName?: string;
}

export interface CreateFromDocumentResponse {
  id: string;
  protocol: string;
  warnings: string[];
}
