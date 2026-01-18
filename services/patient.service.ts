import api from "@/lib/api";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  healthPlanId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientPayload {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  healthPlanId?: string;
}

export const patientService = {
  /**
   * Busca todos os pacientes
   */
  async getAll(): Promise<Patient[]> {
    try {
      const response = await api.get("/patients");
      return response.data.records || response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um paciente específico por ID
   */
  async getById(patientId: string): Promise<Patient> {
    try {
      const response = await api.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cria um novo paciente
   */
  async create(payload: CreatePatientPayload): Promise<Patient> {
    try {
      const response = await api.post("/patients", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Atualiza um paciente
   */
  async update(
    patientId: string,
    payload: Partial<CreatePatientPayload>
  ): Promise<Patient> {
    try {
      const response = await api.patch(`/patients/${patientId}`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Deleta um paciente
   */
  async delete(patientId: string): Promise<void> {
    try {
      await api.delete(`/patients/${patientId}`);
    } catch (error) {
      throw error;
    }
  },
};
