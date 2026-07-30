import api from "@/lib/api";

export interface ClinicalCidCode {
  code: string;
  description: string;
}

export interface ClinicalRecord {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId: string | null;
  anamnesis: string | null;
  physicalExam: string | null;
  diagnosis: string | null;
  cidCodes: ClinicalCidCode[] | null;
  conduct: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalRecordPayload {
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  anamnesis?: string;
  physicalExam?: string;
  diagnosis?: string;
  cidCodes?: ClinicalCidCode[];
  conduct?: string;
}

export type UpdateClinicalRecordPayload = Omit<
  CreateClinicalRecordPayload,
  "patientId" | "doctorId" | "appointmentId"
>;

export const clinicalRecordService = {
  /** Linha do tempo de atendimentos do paciente (mais recentes primeiro). */
  async getByPatient(patientId: string): Promise<ClinicalRecord[]> {
    const response = await api.get<ClinicalRecord[]>("/clinical-records", {
      params: { patientId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /** Ficha vinculada a uma consulta (null se ainda não existir). */
  async getByAppointment(
    appointmentId: string,
  ): Promise<ClinicalRecord | null> {
    const response = await api.get<ClinicalRecord | null>("/clinical-records", {
      params: { appointmentId },
    });
    return response.data ?? null;
  },

  async getById(id: string): Promise<ClinicalRecord> {
    const response = await api.get<ClinicalRecord>(`/clinical-records/${id}`);
    return response.data;
  },

  async create(
    payload: CreateClinicalRecordPayload,
  ): Promise<ClinicalRecord> {
    const response = await api.post<ClinicalRecord>(
      "/clinical-records",
      payload,
    );
    return response.data;
  },

  async update(
    id: string,
    payload: UpdateClinicalRecordPayload,
  ): Promise<ClinicalRecord> {
    const response = await api.patch<ClinicalRecord>(
      `/clinical-records/${id}`,
      payload,
    );
    return response.data;
  },

  async finalize(id: string): Promise<ClinicalRecord> {
    const response = await api.post<ClinicalRecord>(
      `/clinical-records/${id}/finalize`,
      {},
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clinical-records/${id}`);
  },
};
