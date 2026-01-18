import api from "@/lib/api";

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcedurePayload {
  name: string;
  description?: string;
  estimatedDuration?: number;
}

export const procedureService = {
  /**
   * Busca todos os procedimentos
   */
  async getAll(): Promise<Procedure[]> {
    try {
      const response = await api.get("/procedures");
      return response.data.records || response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Usuário não autenticado");
      }
      throw error;
    }
  },

  /**
   * Busca um procedimento específico por ID
   */
  async getById(procedureId: string): Promise<Procedure> {
    try {
      const response = await api.get(`/procedures/${procedureId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo procedimento
   */
  async create(payload: CreateProcedurePayload): Promise<Procedure> {
    try {
      const response = await api.post("/procedures", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um procedimento
   */
  async update(
    procedureId: string,
    payload: Partial<CreateProcedurePayload>
  ): Promise<Procedure> {
    try {
      const response = await api.patch(`/procedures/${procedureId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um procedimento
   */
  async delete(procedureId: string): Promise<void> {
    try {
      await api.delete(`/procedures/${procedureId}`);
    } catch (error) {
      throw error;
    }
  },
};
