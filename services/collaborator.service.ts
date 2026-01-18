import api from "@/lib/api";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  role?: "admin" | "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollaboratorPayload {
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  role?: "admin" | "editor" | "viewer";
}

export const collaboratorService = {
  /**
   * Busca todos os colaboradores/assistentes
   */
  async getAll(): Promise<Collaborator[]> {
    try {
      const response = await api.get("/users?pv=2");
      return response.data.records || response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um colaborador específico por ID
   */
  async getById(collaboratorId: string): Promise<Collaborator> {
    try {
      const response = await api.get(`/users/${collaboratorId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo colaborador
   */
  async create(payload: CreateCollaboratorPayload): Promise<Collaborator> {
    try {
      const response = await api.post("/users", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um colaborador
   */
  async update(
    collaboratorId: string,
    payload: Partial<CreateCollaboratorPayload>
  ): Promise<Collaborator> {
    try {
      const response = await api.patch(`/users/${collaboratorId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um colaborador
   */
  async delete(collaboratorId: string): Promise<void> {
    try {
      await api.delete(`/users/${collaboratorId}`);
    } catch (error) {
      throw error;
    }
  },
};
