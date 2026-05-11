import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface HealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  ansCode?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  authorizationContact?: string;
  authorizationPhone?: string;
  authorizationEmail?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthPlanPayload {
  name: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  ansCode?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  authorizationContact?: string;
  authorizationPhone?: string;
  authorizationEmail?: string;
  website?: string;
}

interface BackendHealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  ansCode?: string;
  zipCode?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  city?: string;
  state?: string;
  authorizationContact?: string;
  authorizationPhone?: string;
  authorizationEmail?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export const healthPlanService = {
  /**
   * Busca todos os convênios
   */
  async getAll(): Promise<HealthPlan[]> {
    const response = await api.get("/health_plans");
    const data = getApiRecords<BackendHealthPlan>(response.data);

    // Mapeia os campos do backend para o frontend
    return data.map((h) => ({
      id: h.id,
      name: h.name,
      cnpj: h.cnpj,
      phone: h.phone,
      email: h.email,
      ansCode: h.ansCode,
      zipCode: h.zipCode,
      address: h.address,
      addressNumber: h.addressNumber,
      addressComplement: h.addressComplement,
      city: h.city,
      state: h.state,
      authorizationContact: h.authorizationContact,
      authorizationPhone: h.authorizationPhone,
      authorizationEmail: h.authorizationEmail,
      website: h.website,
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
    }));
  },

  /**
   * Busca um convênio específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(healthPlanId: string): Promise<HealthPlan | null> {
    const allHealthPlans = await this.getAll();
    return (
      allHealthPlans.find((hp) => String(hp.id) === String(healthPlanId)) ||
      null
    );
  },

  /**
   * Cria um novo convênio
   */
  async create(payload: CreateHealthPlanPayload): Promise<HealthPlan> {
    const response = await api.post("/health_plans", payload);
    return response.data;
  },

  /**
   * Atualiza um convênio
   */
  async update(
    healthPlanId: string,
    payload: Partial<CreateHealthPlanPayload>,
  ): Promise<HealthPlan> {
    const response = await api.patch(`/health_plans/${healthPlanId}`, payload);
    return response.data;
  },

  /**
   * Deleta um convênio
   */
  async delete(healthPlanId: string): Promise<void> {
    await api.delete(`/health_plans/${healthPlanId}`);
  },
};
