export type PriorityLevel = "Baixa" | "Média" | "Alta";

// Status completos da solicitação cirúrgica
export type SurgeryRequestStatus =
  | "Pendente" // 1
  | "Enviada" // 2
  | "Em Análise" // 3
  | "Em Reanálise" // 4
  | "Autorizada" // 5
  | "Agendada" // 6
  | "A Faturar" // 7
  | "Faturada" // 8
  | "Finalizada" // 9
  | "Cancelada"; // 10

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
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: SurgeryRequestStatus;
  cards: SurgeryRequest[];
}
