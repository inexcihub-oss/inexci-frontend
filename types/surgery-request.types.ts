export type PriorityLevel = "Baixa" | "Média" | "Alta";
export type SurgeryRequestStatus =
  | "Pendente"
  | "Enviada"
  | "Aprovada"
  | "Recusada"
  | "Concluída";

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
  messagesCount: number;
  attachmentsCount: number;
  createdAt: string;
  deadline: string;
  status: SurgeryRequestStatus;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: SurgeryRequestStatus;
  cards: SurgeryRequest[];
}
