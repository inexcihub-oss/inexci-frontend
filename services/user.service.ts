import api from "@/lib/api";
import { isUnauthorizedError } from "@/lib/http-error";
import { DoctorProfile, User } from "@/types";
import { uploadService } from "@/services/upload.service";

/**
 * Resposta do endpoint /users/profile.
 * Usa string para id (UUID) consistente com a entidade User.
 */
export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  birth_date?: string;
  gender?: string;
  avatar_url?: string;
  is_doctor?: boolean;
  role?: "admin" | "collaborator";
  account_id?: string;
  status: number;
  doctor_profile?: DoctorProfile;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  document?: string;
  birth_date?: string;
  gender?: string;
  avatar_url?: string;
  signature_url?: string | null;
}

export const userService = {
  /**
   * Busca todos os usuários/gestores
   */
  async getAll(): Promise<User[]> {
    try {
      const response = await api.get("/users?role=collaborator");
      return response.data.records || response.data;
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        throw new Error("Usuário não autenticado");
      }
      throw error;
    }
  },

  /**
   * Busca um usuário específico por ID
   */
  async getById(userId: string): Promise<User> {
    const response = await api.get("/users/one", { params: { id: userId } });
    return response.data;
  },

  /**
   * Busca o perfil do usuário logado
   */
  async getProfile(): Promise<UserProfileResponse> {
    const response = await api.get<UserProfileResponse>("/users/profile");
    return response.data;
  },

  /**
   * Atualiza o perfil do usuário logado
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfileResponse> {
    const response = await api.put<UserProfileResponse>("/users/profile", data);
    return response.data;
  },

  /**
   * Atualiza o doctor_profile do médico logado
   */
  async updateDoctorProfile(
    doctorProfileId: string,
    data: {
      crm?: string;
      crm_state?: string;
      specialty?: string;
      signature_image_url?: string | null;
    },
  ): Promise<DoctorProfile> {
    const response = await api.patch<DoctorProfile>(
      `/users/doctor-profile/${doctorProfileId}`,
      data,
    );
    return response.data;
  },

  /**
   * Faz upload de foto de perfil e atualiza o avatar_url no perfil do usuário.
   * @param file Arquivo de imagem selecionado pelo usuário
   * @returns O perfil atualizado com a nova avatar_url
   */
  async uploadAvatar(file: File): Promise<UserProfileResponse> {
    const uploadResponse = await uploadService.uploadSingle(file, "avatars");
    const avatarUrl = uploadResponse.data.url;
    return this.updateProfile({ avatar_url: avatarUrl });
  },
};
