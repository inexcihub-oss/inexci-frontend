import api from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
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
};
