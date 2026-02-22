import api from "@/lib/api";

export interface OpmeItem {
  id: string;
  surgery_request_id: string;
  name: string;
  brand?: string;
  distributor?: string;
  quantity: number;
  authorized_quantity?: number;
  created_at: string;
}

export interface CreateOpmeData {
  surgery_request_id: string;
  name: string;
  brand?: string;
  distributor?: string;
  quantity: number;
}

export interface UpdateOpmeData {
  id: string;
  name?: string;
  brand?: string;
  distributor?: string;
  quantity?: number;
}

export const opmeService = {
  /**
   * Adiciona um item OPME a uma solicitação
   */
  async create(data: CreateOpmeData): Promise<OpmeItem> {
    try {
      const response = await api.post("/surgery-requests/opme", data);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao adicionar OPME:", error);
      throw error;
    }
  },

  /**
   * Atualiza um item OPME
   */
  async update(data: UpdateOpmeData): Promise<OpmeItem> {
    try {
      const response = await api.put("/surgery-requests/opme", data);
      return response.data;
    } catch (error: any) {
      console.error("Erro ao atualizar OPME:", error);
      throw error;
    }
  },

  /**
   * Remove um item OPME
   */
  async delete(id: string, surgeryRequestId: string): Promise<void> {
    try {
      await api.delete(`/surgery-requests/opme/${id}`, {
        data: { surgery_request_id: surgeryRequestId },
      });
    } catch (error: any) {
      console.error("Erro ao remover OPME:", error);
      throw error;
    }
  },
};
