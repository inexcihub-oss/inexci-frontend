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
  | "Cancelada"; // 9

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

export interface Doctor {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarColor?: string;
}

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
  messagesCount: number;
  attachmentsCount: number;
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
