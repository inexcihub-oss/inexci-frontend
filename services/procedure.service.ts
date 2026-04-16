import api from "@/lib/api";
import { isUnauthorizedError } from "@/lib/http-error";

export interface Procedure {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcedurePayload {
  name: string;
}

export const procedureService = {
  /**
   * Busca todos os procedimentos
   */
  async getAll(): Promise<Procedure[]> {
    try {
      const response = await api.get("/procedures");
      return response.data.records || response.data;
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        throw new Error("Usuário não autenticado");
      }
      throw error;
    }
  },

  /**
   * Busca um procedimento específico por ID
   */
  async getById(procedureId: string): Promise<Procedure> {
    const response = await api.get(`/procedures/${procedureId}`);
    return response.data;
  },

  /**
   * Cria um novo procedimento
   */
  async create(payload: CreateProcedurePayload): Promise<Procedure> {
    const response = await api.post("/procedures", payload);
    return response.data;
  },

  /**
   * Atualiza um procedimento
   */
  async update(
    procedureId: string,
    payload: Partial<CreateProcedurePayload>,
  ): Promise<Procedure> {
    const response = await api.patch(`/procedures/${procedureId}`, payload);
    return response.data;
  },

  /**
   * Deleta um procedimento
   */
  async delete(procedureId: string): Promise<void> {
    await api.delete(`/procedures/${procedureId}`);
  },
};
