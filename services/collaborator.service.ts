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
  is_doctor?: boolean;
  crm?: string;
  crmState?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  crm?: string;
  crmState?: string;
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
  is_doctor?: boolean;
  crm?: string;
  crm_state?: string;
  specialty?: string;
}

export const collaboratorService = {
  /**
   * Busca todos os colaboradores/assistentes
   */
  async getAll(): Promise<Collaborator[]> {
    try {
      const response = await api.get("/users/collaborators");
      const data = response.data.records || response.data;

      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        specialty: user.specialty || null,
        gender: user.gender,
        birthDate: user.birth_date,
        document: user.cpf,
        is_doctor: user.is_doctor || false,
        crm: user.crm || null,
        crmState: user.crm_state || null,
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
      const response = await api.post("/users/collaborators", payload);
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
      const response = await api.patch(
        `/users/collaborators/${collaboratorId}`,
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza o perfil de um colaborador ou médico via PATCH /users/:id
   */
  async updateProfile(
    userId: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      specialty?: string;
      gender?: string;
      birth_date?: string;
      cpf?: string;
    },
  ): Promise<Collaborator> {
    try {
      const response = await api.patch(`/users/${userId}`, payload);
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
      await api.delete(`/users/collaborators/${collaboratorId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca os médicos que pertencem à equipe do administrador da conta.
   * O próprio administrador é excluído da lista (currentUserId).
   */
  async getDoctors(currentUserId?: string): Promise<Doctor[]> {
    try {
      const response = await api.get("/users?role=doctor");
      const data = response.data.records || response.data;

      return data
        .filter((user: any) => user.id !== currentUserId)
        .map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          specialty: user.specialty || null,
          crm: user.crm || null,
          crmState: user.crm_state || null,
          gender: user.gender,
          birthDate: user.birth_date,
          document: user.cpf,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um médico específico por ID
   */
  async getDoctorById(doctorId: string): Promise<Doctor | null> {
    try {
      const response = await api.get(`/users/one`, {
        params: { id: doctorId },
      });
      const user = response.data;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        specialty: user.specialty || user.doctor_profile?.specialty || null,
        crm: user.crm || user.doctor_profile?.crm || null,
        crmState: user.crm_state || user.doctor_profile?.crm_state || null,
        gender: user.gender,
        birthDate: user.birth_date,
        document: user.cpf,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },
};
