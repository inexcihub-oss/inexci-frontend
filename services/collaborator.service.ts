import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";
import { DoctorProfile, DoctorSummary } from "@/types";
import { Permission } from "@/lib/permissions";
import type { ProfessionalCouncil } from "@/lib/professional-council";

export interface Collaborator {
  id: string;
  name: string;
  avatarUrl?: string | null;
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
  permissions?: Permission[];
  grantedPermissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Doctor extends DoctorSummary {
  avatarUrl?: string;
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
  council?: ProfessionalCouncil;
  crm?: string;
  crmState?: string;
  specialty?: string;
  permissions?: Permission[];
}

interface BackendUserRecord {
  id: string;
  name: string;
  avatarUrl?: string | null;
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
  permissions?: Permission[];
  grantedPermissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

function toCollaborator(user: BackendUserRecord): Collaborator {
  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
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
    permissions: user.permissions,
    grantedPermissions: user.grantedPermissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const collaboratorService = {
  async getAll(): Promise<Collaborator[]> {
    const response = await api.get<unknown>("/users/collaborators");
    const data = getApiRecords<BackendUserRecord>(response.data);
    return data.map(toCollaborator);
  },

  async getById(collaboratorId: string): Promise<Collaborator | null> {
    const response = await api.get<BackendUserRecord>(
      `/users/collaborators/${collaboratorId}`,
    );
    return toCollaborator(response.data);
  },

  async create(payload: CreateCollaboratorPayload): Promise<Collaborator> {
    const response = await api.post<Collaborator>(
      "/users/collaborators",
      payload,
    );
    return response.data;
  },

  async update(
    collaboratorId: string,
    payload: Partial<CreateCollaboratorPayload>,
  ): Promise<Collaborator> {
    const response = await api.patch<Collaborator>(
      `/users/collaborators/${collaboratorId}`,
      payload,
    );
    return response.data;
  },

  async updateProfile(
    userId: string,
    payload: {
      name?: string;
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
    const response = await api.patch<Collaborator>(
      `/users/${userId}`,
      payload,
    );
    return response.data;
  },

  async toggleStatus(collaboratorId: string): Promise<{ status: string }> {
    const response = await api.patch<{ status: string }>(
      `/users/collaborators/${collaboratorId}/status`,
    );
    return response.data;
  },

  async resetPassword(
    collaboratorId: string,
    password: string,
  ): Promise<{ message: string }> {
    const response = await api.patch<{ message: string }>(
      `/users/collaborators/${collaboratorId}/reset-password`,
      { password },
    );
    return response.data;
  },

  async resendInvite(
    collaboratorId: string,
  ): Promise<{ message: string; email: string }> {
    const response = await api.post<{ message: string; email: string }>(
      `/users/collaborators/${collaboratorId}/resend-invite`,
    );
    return response.data;
  },

  async delete(collaboratorId: string): Promise<void> {
    await api.delete(`/users/collaborators/${collaboratorId}`);
  },

  async deleteMany(collaboratorIds: string[]): Promise<void> {
    if (!collaboratorIds.length) return;
    await api.post("/users/collaborators/bulk-delete", {
      ids: collaboratorIds,
    });
  },
};
