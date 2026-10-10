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

export interface CreateSurgeryRequestProcedureData {
  surgeryRequestId: string | number;
  procedures: {
    tussCode: string;
    name: string;
    quantity: number;
  }[];
}

export const tussService = {
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

  async addProcedures(data: CreateSurgeryRequestProcedureData): Promise<void> {
    try {
      await api.post("/surgery-requests/procedures", data);
    } catch (error: unknown) {
      logger.error("Erro ao adicionar procedimentos", error);
      throw error;
    }
  },

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
