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

export interface UpdateProcedurePayload {
  name?: string;
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
   * Busca um procedimento por ID
   */
  async getById(id: string): Promise<Procedure> {
    const response = await api.get(`/procedures/${id}`);
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
    id: string,
    payload: UpdateProcedurePayload,
  ): Promise<Procedure> {
    const response = await api.patch(`/procedures/${id}`, payload);
    return response.data;
  },

  /**
   * Exclui um procedimento
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/procedures/${id}`);
  },
};
