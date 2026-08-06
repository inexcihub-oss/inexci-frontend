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
  /** SC gerada ao finalizar; null enquanto a criação estiver pendente. */
  surgeryRequestId: string | null;
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
}

export type UpdateClinicalRecordPayload = Omit<
  CreateClinicalRecordPayload,
  "patientId" | "doctorId" | "appointmentId"
>;

/** Tipos de documento emitidos no atendimento (também usados nas rotas). */
export type ClinicalDocumentKind =
  | "prescription"
  | "medical-certificate"
  | "exam-referral";

/** Documento emitido a partir da ficha (PDF já gravado como documento). */
export interface GeneratedClinicalDocument {
  id: string;
  name: string;
  key: string;
  type: string;
  /** URL assinada, pronta para abrir. */
  uri: string;
  createdAt: string;
}

export interface PrescriptionItem {
  name: string;
  quantity?: string;
  instructions?: string;
}

/**
 * De onde o documento tira paciente e médico.
 *
 * Emitir sempre parte da ficha gravada. A **prévia** aceita a segunda forma:
 * paciente + ficha em memória. Sem isso, "Visualizar" precisava salvar a ficha
 * antes de montar o HTML e criava prontuário vazio só para conferir.
 */
export type ClinicalDocumentTarget =
  | { clinicalRecordId: string }
  | {
      patientId: string;
      doctorId?: string;
      /** CIDs da ficha ainda não salva. */
      cidCodes?: ClinicalCidCode[];
    };

export interface PrescriptionFields {
  items: PrescriptionItem[];
  notes?: string;
}

export interface MedicalCertificateFields {
  restDays?: number;
  startDate?: string;
  /** Reaproveita o CID da ficha quando `cid` não é informado. */
  includeCid?: boolean;
  /** CID escolhido para este atestado; tem precedência sobre `includeCid`. */
  cid?: ClinicalCidCode;
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

  /** Emite a receita e devolve o documento já gravado no prontuário. */
  async generatePrescription(
    payload: PrescriptionPayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/prescription",
      payload,
    );
    return response.data;
  },

  /** Emite o atestado médico. */
  async generateMedicalCertificate(
    payload: MedicalCertificatePayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/medical-certificate",
      payload,
    );
    return response.data;
  },

  /** Emite o encaminhamento (solicitação) de exames. */
  async generateExamReferral(
    payload: ExamReferralPayload,
  ): Promise<GeneratedClinicalDocument> {
    const response = await api.post<GeneratedClinicalDocument>(
      "/clinical-records/documents/exam-referral",
      payload,
    );
    return response.data;
  },

  /**
   * HTML do documento exatamente como será emitido, sem gravar nada — o médico
   * confere antes de assumir o documento. É HTML (e não PDF) porque a prévia
   * serve para olhar na tela: gerar o PDF a cada clique custaria segundos.
   *
   * "Sem gravar nada" inclui a própria ficha: o payload pode apontar o paciente
   * e levar os campos que estão na tela, em vez de exigir uma ficha salva.
   */
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
