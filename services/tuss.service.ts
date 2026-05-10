import api from "@/lib/api";
import { logger } from "@/lib/logger";

export interface TussCode {
  id: string;
  tussCode: string;
  name: string;
  active: boolean;
}

export interface SurgeryRequestTussItem {
  id: string;
  surgeryRequestId: string | number;
  tussCode: string;
  name: string;
  quantity: number;
  authorizedQuantity?: number;
}

// Mantido por compatibilidade
export interface SurgeryRequestProcedure extends SurgeryRequestTussItem {}

export interface CreateSurgeryRequestProcedureData {
  surgeryRequestId: string | number;
  procedures: {
    procedureId: string;
    tussCode: string;
    name: string;
    quantity: number;
  }[];
}

export interface UpdateSurgeryRequestProcedureData {
  surgeryRequestId: string | number;
  procedures: {
    id?: string;
    procedureId: string;
    quantity: number;
  }[];
}

/**
 * Serviço de procedimentos TUSS associados a Solicitações Cirúrgicas.
 *
 * NOTA: Este serviço NÃO é o mesmo que procedure.service.ts.
 * - tuss.service.ts: gerencia procedimentos vinculados a uma solicitação cirúrgica
 *   (POST/DELETE em /surgery-requests/procedures) e busca códigos TUSS (GET /tuss).
 * - procedure.service.ts: CRUD do catálogo de procedimentos persistidos (GET/POST/PATCH/DELETE em /procedures).
 */
export const tussService = {
  /**
   * Busca códigos TUSS do arquivo JSON (novo endpoint)
   */
  async searchTussFromJson(
    search?: string,
    limit: number = 50,
  ): Promise<TussCode[]> {
    try {
      const params: Record<string, string | number> = { limit };
      if (search && search.length >= 2) {
        params.search = search;
      }
      const response = await api.get("/tuss", { params });
      return response.data || [];
    } catch (error: unknown) {
      logger.error("Erro ao buscar códigos TUSS", error);
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
    } catch (error: unknown) {
      logger.error("Erro ao buscar códigos TUSS", error);
      throw error;
    }
  },

  /**
   * Adiciona procedimentos TUSS a uma solicitação
   */
  async addProcedures(data: CreateSurgeryRequestProcedureData): Promise<void> {
    try {
      await api.post("/surgery-requests/procedures", data);
    } catch (error: unknown) {
      logger.error("Erro ao adicionar procedimentos", error);
      throw error;
    }
  },

  /**
   * Atualiza procedimentos TUSS de uma solicitação
   */
  async updateProcedures(
    data: UpdateSurgeryRequestProcedureData,
  ): Promise<void> {
    try {
      await api.post("/surgery-requests/procedures", data);
    } catch (error: unknown) {
      logger.error("Erro ao atualizar procedimentos", error);
      throw error;
    }
  },

  /**
   * Atualiza a quantidade de um procedimento TUSS de uma solicitação
   */
  async updateProcedure(procedureId: string, quantity: number): Promise<void> {
    try {
      await api.patch(`/surgery-requests/procedures/${procedureId}`, {
        quantity,
      });
    } catch (error: unknown) {
      logger.error("Erro ao atualizar procedimento", error);
      throw error;
    }
  },

  /**
   * Remove um procedimento TUSS de uma solicitação
   */
  async removeProcedure(
    surgeryRequestId: string | number,
    procedureId: string,
  ): Promise<void> {
    try {
      await api.delete(`/surgery-requests/procedures/${procedureId}`, {
        data: { surgeryRequestId },
      });
    } catch (error: unknown) {
      logger.error("Erro ao remover procedimento", error);
      throw error;
    }
  },
};
