import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export interface HealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthPlanPayload {
  name: string;
  phone: string;
  email: string;
  cnpj?: string;
}

interface BackendHealthPlan {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
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
      createdAt: h.created_at,
      updatedAt: h.updated_at,
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
