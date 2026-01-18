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
  cnpj?: string;
  phone?: string;
  email?: string;
}

export const healthPlanService = {
  /**
   * Busca todos os convênios
   */
  async getAll(): Promise<HealthPlan[]> {
    try {
      const response = await api.get("/health_plans");
      return response.data.records || response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um convênio específico por ID
   */
  async getById(healthPlanId: string): Promise<HealthPlan> {
    try {
      const response = await api.get(`/health_plans/${healthPlanId}`);
      return response.data;
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
    payload: Partial<CreateHealthPlanPayload>
  ): Promise<HealthPlan> {
    try {
      const response = await api.patch(
        `/health_plans/${healthPlanId}`,
        payload
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
