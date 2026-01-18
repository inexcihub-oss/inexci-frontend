import api from "@/lib/api";
import { SurgeryRequestStatus } from "@/types/surgery-request.types";

export interface UpdateStatusPayload {
  status: SurgeryRequestStatus;
}

// Mapeamento de status string para número (conforme backend)
const STATUS_MAP: Record<SurgeryRequestStatus, number> = {
  Pendente: 1,
  Enviada: 2,
  Aprovada: 3, // inAnalysis
  Recusada: 10,
  Concluída: 9,
};

// Mapeamento reverso: número para string
export const STATUS_NUMBER_TO_STRING: Record<number, SurgeryRequestStatus> = {
  1: "Pendente",
  2: "Enviada",
  3: "Aprovada", // inAnalysis
  4: "Aprovada", // inReanalysis
  5: "Aprovada", // awaitingAppointment
  6: "Aprovada", // scheduled
  7: "Aprovada", // toInvoice
  8: "Aprovada", // invoiced
  9: "Concluída", // received
  10: "Recusada", // canceled
};

export interface CreateSurgeryRequestPayload {
  procedureId: string;
  patientId: string;
  hospitalId: string;
  healthPlanId?: string;
  managerId?: string;
  scheduledDate?: string;
  priority?: string;
  observations?: string;
}

export interface SimpleSurgeryRequestPayload {
  is_indication: boolean;
  indication_name?: string;
  procedure_id?: number;
  patient: {
    name: string;
    email: string;
    phone: string;
  };
  collaborator: {
    status: number;
    name: string;
    email: string;
    phone: string;
    password: string;
  };
  health_plan: {
    name: string;
    email: string;
    phone: string;
  };
}

export const surgeryRequestService = {
  /**
   * Atualiza o status de um procedimento cirúrgico
   */
  async updateStatus(
    requestId: string,
    status: SurgeryRequestStatus,
  ): Promise<void> {
    try {
      const statusNumber = STATUS_MAP[status];
      if (!statusNumber) {
        throw new Error(`Status inválido: ${status}`);
      }
      await api.patch(`/surgery-requests/${requestId}/status`, {
        status: statusNumber,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca todos os procedimentos cirúrgicos
   */
  async getAll(): Promise<any> {
    try {
      const response = await api.get("/surgery-requests");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um procedimento específico por ID
   */
  async getById(requestId: string): Promise<any> {
    try {
      const response = await api.get(`/surgery-requests/one?id=${requestId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo procedimento cirúrgico
   */
  async create(data: CreateSurgeryRequestPayload): Promise<any> {
    try {
      const response = await api.post("/surgery-requests", data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria uma nova solicitação cirúrgica simplificada
   */
  async createSimple(data: SimpleSurgeryRequestPayload): Promise<any> {
    try {
      console.log("🔄 Chamando API /surgery-requests/simple com dados:", data);
      const response = await api.post("/surgery-requests/simple", data);
      console.log("📥 Resposta da API:", response);
      return response.data;
    } catch (error: any) {
      console.error("❌ Erro na chamada da API:", error);
      console.error("Resposta de erro:", error?.response);
      throw error;
    }
  },
};
