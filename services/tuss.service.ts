import api from "@/lib/api";

export interface TussCode {
  id: string;
  tuss_code: string;
  name: string;
  active: boolean;
}

export interface SurgeryRequestProcedure {
  id: string;
  surgery_request_id: string;
  procedure_id: string;
  quantity: number;
  authorized_quantity?: number;
  procedure: TussCode;
}

export interface CreateSurgeryRequestProcedureData {
  surgery_request_id: string;
  procedures: {
    procedure_id: string;
    quantity: number;
  }[];
}

export interface UpdateSurgeryRequestProcedureData {
  surgery_request_id: string;
  procedures: {
    id?: string;
    procedure_id: string;
    quantity: number;
  }[];
}

export const tussService = {
  /**
   * Busca códigos TUSS do arquivo JSON (novo endpoint)
   */
  async searchTussFromJson(search?: string, limit: number = 50): Promise<TussCode[]> {
    try {
      const params: Record<string, string | number> = { limit };
      if (search && search.length >= 2) {
        params.search = search;
      }
      const response = await api.get("/tuss", { params });
      return response.data || [];
    } catch (error: any) {
      console.error("Erro ao buscar códigos TUSS:", error);
      throw error;
    }
  },

  /**
   * Busca todos os códigos TUSS disponíveis (endpoint antigo - procedures)
   */
  async searchTussCodes(search?: string): Promise<TussCode[]> {
    try {
      const params = search ? { search } : {};
      const response = await api.get("/procedures", { params });
      return response.data.records || response.data || [];
    } catch (error: any) {
      console.error("Erro ao buscar códigos TUSS:", error);
      throw error;
    }
  },

  /**
   * Adiciona procedimentos TUSS a uma solicitação
   */
  async addProcedures(data: CreateSurgeryRequestProcedureData): Promise<void> {
    try {
      await api.post("/surgery-requests/procedures", data);
    } catch (error: any) {
      console.error("Erro ao adicionar procedimentos:", error);
      throw error;
    }
  },

  /**
   * Atualiza procedimentos TUSS de uma solicitação
   */
  async updateProcedures(data: UpdateSurgeryRequestProcedureData): Promise<void> {
    try {
      await api.post("/surgery-requests/procedures", data);
    } catch (error: any) {
      console.error("Erro ao atualizar procedimentos:", error);
      throw error;
    }
  },

  /**
   * Remove um procedimento TUSS de uma solicitação
   */
  async removeProcedure(
    surgeryRequestId: string,
    procedureId: string
  ): Promise<void> {
    try {
      await api.delete(`/surgery-requests/procedures/${procedureId}`, {
        data: { surgery_request_id: surgeryRequestId },
      });
    } catch (error: any) {
      console.error("Erro ao remover procedimento:", error);
      throw error;
    }
  },
};
