import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import { DoctorProfile, DoctorSummary } from "@/types";

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  document?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  isDoctor?: boolean;
  doctorProfile?: DoctorProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends DoctorSummary {
  gender?: string;
  birthDate?: string;
  document?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollaboratorPayload {
  name: string;
  email: string;
  phone?: string;
  isDoctor?: boolean;
  crm?: string;
  crmState?: string;
  specialty?: string;
}

interface BackendUserRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  birthDate?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  status?: string;
  isDoctor?: boolean;
  doctorProfile?: DoctorProfile;
  createdAt: string;
  updatedAt: string;
}

function toCollaborator(user: BackendUserRecord): Collaborator {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: user.birthDate,
    document: user.cpf,
    cep: user.cep,
    address: user.address,
    addressNumber: user.addressNumber,
    addressComplement: user.addressComplement,
    city: user.city,
    state: user.state,
    status: user.status,
    isDoctor: user.isDoctor || !!user.doctorProfile,
    doctorProfile: user.doctorProfile || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toDoctor(user: BackendUserRecord): Doctor {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: user.birthDate,
    document: user.cpf,
    cep: user.cep,
    address: user.address,
    addressNumber: user.addressNumber,
    addressComplement: user.addressComplement,
    city: user.city,
    state: user.state,
    status: user.status,
    doctorProfile: user.doctorProfile || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const collaboratorService = {
  /**
   * Busca todos os colaboradores/assistentes
   */
  async getAll(): Promise<Collaborator[]> {
    const response = await api.get("/users/collaborators");
    const data = getApiRecords<BackendUserRecord>(response.data);
    return data.map(toCollaborator);
  },

  /**
   * Busca um colaborador específico por ID
   */
  async getById(collaboratorId: string): Promise<Collaborator | null> {
    const response = await api.get<BackendUserRecord>(`/users/one`, {
      params: { id: collaboratorId },
    });
    return toCollaborator(response.data);
  },

  /**
   * Cria um novo colaborador
   */
  async create(payload: CreateCollaboratorPayload): Promise<Collaborator> {
    const response = await api.post("/users/collaborators", payload);
    return response.data;
  },

  /**
   * Atualiza um colaborador
   */
  async update(
    collaboratorId: string,
    payload: Partial<CreateCollaboratorPayload>,
  ): Promise<Collaborator> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}`,
      payload,
    );
    return response.data;
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
      birthDate?: string;
      cpf?: string;
      cep?: string;
      address?: string;
      addressNumber?: string;
      addressComplement?: string;
      city?: string;
      state?: string;
    },
  ): Promise<Collaborator> {
    const response = await api.patch(`/users/${userId}`, payload);
    return response.data;
  },

  /**
   * Alterna o status ativo/inativo de um colaborador
   */
  async toggleStatus(collaboratorId: string): Promise<{ status: string }> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}/status`,
    );
    return response.data;
  },

  /**
   * Redefine a senha de um colaborador
   */
  async resetPassword(
    collaboratorId: string,
    password: string,
  ): Promise<{ message: string }> {
    const response = await api.patch(
      `/users/collaborators/${collaboratorId}/reset-password`,
      { password },
    );
    return response.data;
  },

  /**
   * Reenvia o e-mail de convite (link de primeiro acesso) para um colaborador
   * com status pendente. Gera um novo token válido por 72h.
   */
  async resendInvite(
    collaboratorId: string,
  ): Promise<{ message: string; email: string }> {
    const response = await api.post(
      `/users/collaborators/${collaboratorId}/resend-invite`,
    );
    return response.data;
  },

  /**
   * Deleta um colaborador
   */
  async delete(collaboratorId: string): Promise<void> {
    await api.delete(`/users/collaborators/${collaboratorId}`);
  },

  /**
   * Busca os médicos que pertencem à equipe do administrador da conta.
   * O próprio administrador é excluído da lista (currentUserId).
   */
  async getDoctors(currentUserId?: string): Promise<Doctor[]> {
    const response = await api.get("/users/doctors");
    const data = getApiRecords<BackendUserRecord>(response.data);

    return data.filter((user) => user.id !== currentUserId).map(toDoctor);
  },

  /**
   * Busca um médico específico por ID
   */
  async getDoctorById(doctorId: string): Promise<Doctor | null> {
    const response = await api.get<BackendUserRecord>(`/users/one`, {
      params: { id: doctorId },
    });
    return toDoctor(response.data);
  },
};
