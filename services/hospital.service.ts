import api from "@/lib/api";

export interface Hospital {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalPayload {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
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
      return data.map((h: any) => ({
        id: h.id,
        name: h.name,
        cnpj: h.cnpj,
        phone: h.phone,
        email: h.email,
        address: h.address,
        address_number: h.address_number,
        neighborhood: h.neighborhood,
        city: h.city,
        state: h.state,
        zip_code: h.zip_code,
        contact_name: h.contact_name,
        contact_phone: h.contact_phone,
        contact_email: h.contact_email,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
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
