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
  surgicalIndication: boolean;
  surgeryRequestId: string | null;
  procedureId: string | null;
  procedure: { id: string; name: string } | null;
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
  surgicalIndication?: boolean;
  procedureId?: string | null;
}

export type UpdateClinicalRecordPayload = Omit<
  CreateClinicalRecordPayload,
  "patientId" | "doctorId" | "appointmentId"
>;

export type ClinicalDocumentKind =
  | "prescription"
  | "medical-certificate"
  | "exam-referral";

export interface GeneratedClinicalDocument {
  id: string;
  name: string;
  key: string;
  type: string;
  uri: string;
  createdAt: string;
}

export interface PrescriptionItem {
  name: string;
  quantity?: string;
  instructions?: string;
}

export type ClinicalDocumentTarget =
  | { clinicalRecordId: string }
  | {
      patientId: string;
      doctorId?: string;
      cidCodes?: ClinicalCidCode[];
    };

export interface PrescriptionFields {
  items: PrescriptionItem[];
  notes?: string;
}

export interface MedicalCertificateFields {
  restDays?: number;
  startDate?: string;
  includeCid?: boolean;
  cid?: ClinicalCidCode;
  text?: string;
  templateId?: string;
  observations?: string;
}

export interface ExamReferralItem {
  name: string;
  tussCode?: string;
  observation?: string;
}

export interface ExamReferralFields {
  exams: ExamReferralItem[];
  clinicalIndication?: string;
  cidCodes?: ClinicalCidCode[];
}

export type PrescriptionPayload = { clinicalRecordId: string } & PrescriptionFields;
export type MedicalCertificatePayload = {
  clinicalRecordId: string;
} & MedicalCertificateFields;
export type ExamReferralPayload = {
  clinicalRecordId: string;
} & ExamReferralFields;

export type ClinicalDocumentPreviewPayload = ClinicalDocumentTarget &
  (PrescriptionFields | MedicalCertificateFields | ExamReferralFields);

export const clinicalRecordService = {
  async getByPatient(patientId: string): Promise<ClinicalRecord[]> {
    const response = await api.get<ClinicalRecord[]>("/clinical-records", {
      params: { patientId },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

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

  async generatePrescription(
    payload: PrescriptionPayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/prescription",
      payload,
    );
    return response.data;
  },

  async generateMedicalCertificate(
    payload: MedicalCertificatePayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/medical-certificate",
      payload,
    );
    return response.data;
  },

  async generateExamReferral(
    payload: ExamReferralPayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/exam-referral",
      payload,
    );
    return response.data;
  },

  async previewDocument(
    kind: ClinicalDocumentKind,
    payload: ClinicalDocumentPreviewPayload,
  ): Promise<string> {
    const response = await api.post<{ html: string }>(
      `/clinical-records/documents/${kind}/preview`,
      payload,
    );
    return response.data.html;
  },
};
