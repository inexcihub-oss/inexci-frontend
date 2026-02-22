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
  "Em Agendamento": 4,
  Agendada: 5,
  Realizada: 6,
  Faturada: 7,
  Finalizada: 8,
  Cancelada: 9,
};

// Mapeamento reverso: número para string
export const STATUS_NUMBER_TO_STRING: Record<number, SurgeryRequestStatus> = {
  1: "Pendente",
  2: "Enviada",
  3: "Em Análise",
  4: "Em Agendamento",
  5: "Agendada",
  6: "Realizada",
  7: "Faturada",
  8: "Finalizada",
  9: "Cancelada",
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
  "Em Agendamento": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Agendada: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  Realizada: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
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
  procedure_id: string;
  patient_id: string;
  manager_id: string;
  health_plan_id?: string;
  hospital_id?: string;
  priority: number;
}

export interface UpdateBasicDataPayload {
  priority?: number;
  deadline?: string | null;
  manager_id?: string;
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
      const response = await api.post("/surgery-requests", data);
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

  /**
   * Atualiza dados básicos da solicitação (prioridade, prazo, gestor)
   */
  async updateBasicData(
    requestId: string,
    data: UpdateBasicDataPayload,
  ): Promise<any> {
    try {
      const response = await api.patch(
        `/surgery-requests/${requestId}/basic`,
        data,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza dados do procedimento
   */
  async update(requestId: string, data: any): Promise<any> {
    try {
      const response = await api.put("/surgery-requests", {
        id: requestId,
        ...data,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Envia a solicitação (muda status de Pendente para Enviada)
   */
  async send(requestId: string): Promise<any> {
    try {
      const response = await api.post("/surgery-requests/send", {
        id: requestId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
