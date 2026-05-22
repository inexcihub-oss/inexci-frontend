import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface Hospital {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospitalPayload {
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

interface BackendHospital {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export const hospitalService = {
  /**
   * Busca todos os hospitais
   */
  async getAll(): Promise<Hospital[]> {
    const response = await api.get("/hospitals");
    const data = getApiRecords<BackendHospital>(response.data);

    return data.map((h) => ({
      id: h.id,
      name: h.name,
      cnpj: h.cnpj,
      phone: h.phone,
      email: h.email,
      address: h.address,
      addressNumber: h.addressNumber,
      neighborhood: h.neighborhood,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
      contactName: h.contactName,
      contactPhone: h.contactPhone,
      contactEmail: h.contactEmail,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
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

  async deleteMany(hospitalIds: string[]): Promise<void> {
    if (!hospitalIds.length) return;
    await api.post("/hospitals/bulk-delete", { ids: hospitalIds });
  },
};
