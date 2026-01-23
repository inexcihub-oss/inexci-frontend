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
      const data = response.data.records || response.data;
      // Mapeia os campos do backend para o frontend
      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        cnpj: user.document, // O campo 'document' armazena CNPJ
        phone: user.phone,
        email: user.email,
        address: user.company, // O campo 'company' é usado para endereço
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um hospital específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(hospitalId: string): Promise<Hospital | null> {
    try {
      const allHospitals = await this.getAll();
      return (
        allHospitals.find((h) => String(h.id) === String(hospitalId)) || null
      );
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
    payload: Partial<CreateHospitalPayload>,
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
