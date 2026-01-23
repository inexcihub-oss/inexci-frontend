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
      const data = response.data.records || response.data;
      // Mapeia os campos do backend para o frontend
      return data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpf: user.document, // O campo 'document' armazena CPF
        dateOfBirth: user.birth_date, // Campo data de nascimento
        gender: user.gender,
        address: user.company, // O campo 'company' pode ser usado para endereço
        healthPlanId: user.health_plan_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Busca um paciente específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(patientId: string): Promise<Patient | null> {
    try {
      const allPatients = await this.getAll();
      return (
        allPatients.find((p) => String(p.id) === String(patientId)) || null
      );
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
    payload: Partial<CreatePatientPayload>,
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
