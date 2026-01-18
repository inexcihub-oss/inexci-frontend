import api from "@/lib/api";

export interface Hospital {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalPayload {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const hospitalService = {
  /**
   * Busca todos os hospitais
   */
  async getAll(): Promise<Hospital[]> {
    try {
      const response = await api.get("/hospitals");
      return response.data.records || response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um hospital específico por ID
   */
  async getById(hospitalId: string): Promise<Hospital> {
    try {
      const response = await api.get(`/hospitals/${hospitalId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo hospital
   */
  async create(payload: CreateHospitalPayload): Promise<Hospital> {
    try {
      const response = await api.post("/hospitals", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um hospital
   */
  async update(
    hospitalId: string,
    payload: Partial<CreateHospitalPayload>
  ): Promise<Hospital> {
    try {
      const response = await api.patch(`/hospitals/${hospitalId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um hospital
   */
  async delete(hospitalId: string): Promise<void> {
    try {
      await api.delete(`/hospitals/${hospitalId}`);
    } catch (error) {
      throw error;
    }
  },
};
