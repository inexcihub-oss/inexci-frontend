import api from "@/lib/api";

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  health_plan_id?: string;
  health_plan_number?: string;
  health_plan_type?: string;
  medical_notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePatientPayload {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  gender?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  health_plan_id?: string;
  health_plan_number?: string;
  health_plan_type?: string;
  medical_notes?: string;
}

export interface CreatePatientPayload extends UpdatePatientPayload {
  name: string;
}

export const patientService = {
  /**
   * Busca todos os pacientes
   */
  async getAll(): Promise<Patient[]> {
    try {
      const response = await api.get("/patients");
      const data = response.data.records || response.data;
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        cpf: p.cpf,
        birth_date: p.birth_date
          ? typeof p.birth_date === "string"
            ? p.birth_date.substring(0, 10)
            : new Date(p.birth_date).toISOString().substring(0, 10)
          : undefined,
        gender: p.gender,
        address: p.address,
        address_number: p.address_number,
        address_complement: p.address_complement,
        neighborhood: p.neighborhood,
        city: p.city,
        state: p.state,
        zip_code: p.zip_code,
        health_plan_id: p.health_plan_id,
        health_plan_number: p.health_plan_number,
        health_plan_type: p.health_plan_type,
        medical_notes: p.medical_notes,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
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
    payload: UpdatePatientPayload,
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
