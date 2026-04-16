import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

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

interface BackendPatient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string | Date;
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
  created_at: string;
  updated_at: string;
}

export const patientService = {
  /**
   * Busca todos os pacientes
   */
  async getAll(): Promise<Patient[]> {
    const response = await api.get("/patients");
    const data = getApiRecords<BackendPatient>(response.data);

    return data.map((p) => ({
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
  },

  /**
   * Busca um paciente específico por ID
   * Como o backend não tem endpoint getById, buscamos todos e filtramos
   */
  async getById(patientId: string): Promise<Patient | null> {
    const allPatients = await this.getAll();
    return allPatients.find((p) => String(p.id) === String(patientId)) || null;
  },

  /**
   * Cria um novo paciente
   */
  async create(payload: CreatePatientPayload): Promise<Patient> {
    const response = await api.post("/patients", payload);
    return response.data;
  },

  /**
   * Atualiza um paciente
   */
  async update(
    patientId: string,
    payload: UpdatePatientPayload,
  ): Promise<Patient> {
    const response = await api.patch(`/patients/${patientId}`, payload);
    return response.data;
  },

  /**
   * Deleta um paciente
   */
  async delete(patientId: string): Promise<void> {
    await api.delete(`/patients/${patientId}`);
  },
};
