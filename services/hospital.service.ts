import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

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

interface BackendHospital {
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
  created_at: string;
  updated_at: string;
}

export const hospitalService = {
  /**
   * Busca todos os hospitais
   */
  async getAll(): Promise<Hospital[]> {
    const response = await api.get("/hospitals");
    const data = getApiRecords<BackendHospital>(response.data);

    // Mapeia os campos do backend para o frontend
    return data.map((h) => ({
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
  },

  /**
   * Busca um hospital específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(hospitalId: string): Promise<Hospital | null> {
    const allHospitals = await this.getAll();
    return (
      allHospitals.find((h) => String(h.id) === String(hospitalId)) || null
    );
  },

  /**
   * Cria um novo hospital
   */
  async create(payload: CreateHospitalPayload): Promise<Hospital> {
    const response = await api.post("/hospitals", payload);
    return response.data;
  },

  /**
   * Atualiza um hospital
   */
  async update(
    hospitalId: string,
    payload: Partial<CreateHospitalPayload>,
  ): Promise<Hospital> {
    const response = await api.patch(`/hospitals/${hospitalId}`, payload);
    return response.data;
  },

  /**
   * Deleta um hospital
   */
  async delete(hospitalId: string): Promise<void> {
    await api.delete(`/hospitals/${hospitalId}`);
  },
};
