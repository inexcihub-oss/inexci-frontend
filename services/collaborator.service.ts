import api from "@/lib/api";

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  role?: "admin" | "editor" | "viewer";
  gender?: string;
  birthDate?: string;
  document?: string;
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
      const response = await api.get("/users?role=collaborator");
      const data = response.data.records || response.data;

      // Mapeia os campos do backend para o frontend
      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        specialty: user.specialty || null,
        gender: user.gender,
        birthDate: user.birth_date,
        document: user.cpf,
        // Como estamos buscando role=collaborator, todos são editors por padrão
        role: "editor",
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um colaborador específico por ID
   */
  async getById(collaboratorId: string): Promise<Collaborator | null> {
    try {
      const response = await api.get(`/users/one`, {
        params: { id: collaboratorId },
      });
      const user = response.data;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        specialty: user.specialty || null,
        gender: user.gender,
        birthDate: user.birth_date,
        document: user.cpf,
        role: "editor",
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
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
    payload: Partial<CreateCollaboratorPayload>,
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
