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
  address_number?: string;
  address_complement?: string;
  city?: string;
  state?: string;
  status?: string;
  is_doctor?: boolean;
  doctor_profile?: DoctorProfile;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends DoctorSummary {
  gender?: string;
  birthDate?: string;
  document?: string;
  cep?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
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
  is_doctor?: boolean;
  crm?: string;
  crm_state?: string;
  specialty?: string;
}

interface BackendUserRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender?: string;
  birth_date?: string;
  cpf?: string;
  cep?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  city?: string;
  state?: string;
  status?: string;
  is_doctor?: boolean;
  doctor_profile?: DoctorProfile;
  created_at: string;
  updated_at: string;
}

function toCollaborator(user: BackendUserRecord): Collaborator {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: user.birth_date,
    document: user.cpf,
    cep: user.cep,
    address: user.address,
    address_number: user.address_number,
    address_complement: user.address_complement,
    city: user.city,
    state: user.state,
    status: user.status,
    is_doctor: user.is_doctor || !!user.doctor_profile,
    doctor_profile: user.doctor_profile || undefined,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function toDoctor(user: BackendUserRecord): Doctor {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    gender: user.gender,
    birthDate: user.birth_date,
    document: user.cpf,
    cep: user.cep,
    address: user.address,
    address_number: user.address_number,
    address_complement: user.address_complement,
    city: user.city,
    state: user.state,
    status: user.status,
    doctor_profile: user.doctor_profile || undefined,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
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
      birth_date?: string;
      cpf?: string;
      cep?: string;
      address?: string;
      address_number?: string;
      address_complement?: string;
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
