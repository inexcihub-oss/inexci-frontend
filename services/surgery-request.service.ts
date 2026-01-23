import api from "@/lib/api";
import { SurgeryRequestStatus } from "@/types/surgery-request.types";

export interface UpdateStatusPayload {
  status: SurgeryRequestStatus;
}

// Mapeamento de status string para número (conforme backend)
export const STATUS_MAP: Record<SurgeryRequestStatus, number> = {
  Pendente: 1,
  Enviada: 2,
  "Em Análise": 3,
  "Em Reanálise": 4,
  Autorizada: 5,
  Agendada: 6,
  "A Faturar": 7,
  Faturada: 8,
  Finalizada: 9,
  Cancelada: 10,
};

// Mapeamento reverso: número para string
export const STATUS_NUMBER_TO_STRING: Record<number, SurgeryRequestStatus> = {
  1: "Pendente",
  2: "Enviada",
  3: "Em Análise",
  4: "Em Reanálise",
  5: "Autorizada",
  6: "Agendada",
  7: "A Faturar",
  8: "Faturada",
  9: "Finalizada",
  10: "Cancelada",
};

// Cores de status para UI
export const STATUS_COLORS: Record<
  SurgeryRequestStatus,
  { bg: string; text: string; border: string }
> = {
  Pendente: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  Enviada: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  "Em Análise": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  "Em Reanálise": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Autorizada: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  Agendada: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  "A Faturar": {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  Faturada: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  Finalizada: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  Cancelada: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
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
      const response = await api.post("/surgery-requests/simple", data);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Aprova uma solicitação (transição de Em Análise/Reanálise para Autorizada)
   */
  async approve(requestId: string): Promise<any> {
    try {
      const response = await api.post(`/surgery-requests/${requestId}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Nega uma solicitação
   */
  async deny(requestId: string, contestReason: string): Promise<any> {
    try {
      const response = await api.post(`/surgery-requests/${requestId}/deny`, {
        contest_reason: contestReason,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Transiciona manualmente para um status específico
   */
  async transition(requestId: string, newStatus: number): Promise<any> {
    try {
      const response = await api.post(
        `/surgery-requests/${requestId}/transition`,
        {
          new_status: newStatus,
        },
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
