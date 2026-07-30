import api from "@/lib/api";
import { ClinicalCidCode } from "./clinical-record.service";

/** Modelo de anamnese reaproveitado entre atendimentos. */
export interface ClinicalRecordTemplate {
  id: string;
  doctorId: string;
  name: string;
  specialty: string | null;
  anamnesis: string | null;
  physicalExam: string | null;
  diagnosis: string | null;
  conduct: string | null;
  cidCodes: ClinicalCidCode[] | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClinicalRecordTemplatePayload {
  name: string;
  doctorId?: string;
  specialty?: string;
  anamnesis?: string;
  physicalExam?: string;
  diagnosis?: string;
  conduct?: string;
  cidCodes?: ClinicalCidCode[];
}

export const clinicalRecordTemplateService = {
  /** Modelos da clínica; com `doctorId`, só os daquele médico. */
  async getAll(doctorId?: string): Promise<ClinicalRecordTemplate[]> {
    const response = await api.get<ClinicalRecordTemplate[]>(
      "/clinical-records/templates",
      { params: { doctorId } },
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(
    payload: CreateClinicalRecordTemplatePayload,
  ): Promise<ClinicalRecordTemplate> {
    const response = await api.post<ClinicalRecordTemplate>(
      "/clinical-records/templates",
      payload,
    );
    return response.data;
  },

  /** Devolve o modelo para preencher a ficha e conta o uso no servidor. */
  async apply(id: string): Promise<ClinicalRecordTemplate> {
    const response = await api.post<ClinicalRecordTemplate>(
      `/clinical-records/templates/${id}/apply`,
      {},
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clinical-records/templates/${id}`);
  },
};
