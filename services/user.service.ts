import api from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  birth_date?: string;
  gender?: string;
  specialty?: string;
  crm?: string;
  crm_state?: string;
  avatar_url?: string;
  signature_url?: string;
  profile: number;
  status: number;
  clinic_id?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  document?: string;
  birth_date?: string;
  gender?: string;
  specialty?: string;
  crm?: string;
  crm_state?: string;
  avatar_url?: string;
  signature_url?: string;
}

export const userService = {
  /**
   * Busca todos os usuários/gestores
   */
  async getAll(): Promise<User[]> {
    try {
      const response = await api.get("/users?profile=2");
      return response.data.records || response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("Usuário não autenticado");
      }
      throw error;
    }
  },

  /**
   * Busca um usuário específico por ID
   */
  async getById(userId: string): Promise<User> {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca o perfil do usuário logado
   */
  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>("/users/profile");
    return response.data;
  },

  /**
   * Atualiza o perfil do usuário logado
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await api.put<UserProfile>("/users/profile", data);
    return response.data;
  },
};
