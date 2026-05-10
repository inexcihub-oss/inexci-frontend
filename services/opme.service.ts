import api from "@/lib/api";
import { logger } from "@/lib/logger";

export interface OpmeSupplier {
  id: string;
  name: string;
}

export interface OpmeItem {
  id: string;
  surgeryRequestId: string | number;
  name: string;
  brand?: string;
  suppliers: OpmeSupplier[];
  quantity: number;
  authorizedQuantity?: number;
  createdAt: string;
}

export interface CreateOpmeData {
  surgeryRequestId: string | number;
  name: string;
  brand?: string;
  supplierIds?: string[];
  supplierNames?: string[];
  quantity: number;
}

export interface UpdateOpmeData {
  id: string;
  name?: string;
  brand?: string;
  supplierIds?: string[];
  supplierNames?: string[];
  quantity?: number;
}

export const opmeService = {
  async create(data: CreateOpmeData): Promise<OpmeItem> {
    try {
      const response = await api.post("/surgery-requests/opme", data);
      return response.data;
    } catch (error: unknown) {
      logger.error("Erro ao adicionar OPME", error);
      throw error;
    }
  },

  async update(data: UpdateOpmeData): Promise<OpmeItem> {
    try {
      const response = await api.put("/surgery-requests/opme", data);
      return response.data;
    } catch (error: unknown) {
      logger.error("Erro ao atualizar OPME", error);
      throw error;
    }
  },

  async delete(id: string, surgeryRequestId: string | number): Promise<void> {
    try {
      await api.delete(`/surgery-requests/opme/${id}`, {
        data: { surgeryRequestId },
      });
    } catch (error: unknown) {
      logger.error("Erro ao remover OPME", error);
      throw error;
    }
  },

  async setHasOpme(
    surgeryRequestId: string | number,
    hasOpme: boolean,
  ): Promise<void> {
    try {
      await api.patch(`/surgery-requests/${surgeryRequestId}/has-opme`, {
        hasOpme,
      });
    } catch (error: unknown) {
      logger.error("Erro ao definir status de OPME", error);
      throw error;
    }
  },
};
