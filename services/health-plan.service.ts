import api from "@/lib/api";

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

export const healthPlanService = {
  /**
   * Busca todos os convênios
   */
  async getAll(): Promise<HealthPlan[]> {
    try {
      const response = await api.get("/health_plans");
      const data = response.data.records || response.data;
      // Mapeia os campos do backend para o frontend
      return data.map((h: any) => ({
        id: h.id,
        name: h.name,
        cnpj: h.cnpj,
        phone: h.phone,
        email: h.email,
        createdAt: h.created_at,
        updatedAt: h.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um convênio específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(healthPlanId: string): Promise<HealthPlan | null> {
    try {
      const allHealthPlans = await this.getAll();
      return (
        allHealthPlans.find((hp) => String(hp.id) === String(healthPlanId)) ||
        null
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo convênio
   */
  async create(payload: CreateHealthPlanPayload): Promise<HealthPlan> {
    try {
      const response = await api.post("/health_plans", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um convênio
   */
  async update(
    healthPlanId: string,
    payload: Partial<CreateHealthPlanPayload>,
  ): Promise<HealthPlan> {
    try {
      const response = await api.patch(
        `/health_plans/${healthPlanId}`,
        payload,
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um convênio
   */
  async delete(healthPlanId: string): Promise<void> {
    try {
      await api.delete(`/health_plans/${healthPlanId}`);
    } catch (error) {
      throw error;
    }
  },
};
