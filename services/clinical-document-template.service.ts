import api from "@/lib/api";

export type ClinicalDocumentTemplateKind =
  | "medical_certificate"
  | "exam_referral";

export const DOCUMENT_TEMPLATE_KIND_LABELS: Record<
  ClinicalDocumentTemplateKind,
  string
> = {
  medical_certificate: "Atestado",
  exam_referral: "Pedido de exame",
};

export const DOCUMENT_TEMPLATE_PLACEHOLDERS: { key: string; label: string }[] =
  [
    { key: "paciente.nome", label: "Nome do paciente" },
    { key: "paciente.cpf", label: "CPF do paciente" },
    { key: "paciente.nascimento", label: "Nascimento do paciente" },
    { key: "medico.nome", label: "Nome do médico" },
    { key: "medico.registro", label: "Registro (CRM/UF)" },
    { key: "data", label: "Data de emissão" },
    { key: "dias", label: "Dias de afastamento" },
    { key: "inicio", label: "Início do afastamento" },
  ];

export const DOCUMENT_TEMPLATE_BODY_MAX = 2000;

export interface ClinicalDocumentTemplate {
  id: string;
  doctorId: string;
  kind: ClinicalDocumentTemplateKind;
  name: string;
  body: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyDocumentTemplatePayload {
  clinicalRecordId?: string;
  patientId?: string;
  doctorId?: string;
  refresh?: boolean;
}

export const clinicalDocumentTemplateService = {
  async getAll(filtro: {
    kind?: ClinicalDocumentTemplateKind;
    doctorId?: string;
  }): Promise<ClinicalDocumentTemplate[]> {
    const response = await api.get<ClinicalDocumentTemplate[]>(
      "/clinical-records/document-templates",
      { params: filtro },
    );
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(payload: {
    kind: ClinicalDocumentTemplateKind;
    name: string;
    body: string;
  }): Promise<ClinicalDocumentTemplate> {
    const response = await api.post<ClinicalDocumentTemplate>(
      "/clinical-records/document-templates",
      payload,
    );
    return response.data;
  },

  async update(
    id: string,
    payload: { name?: string; body?: string },
  ): Promise<ClinicalDocumentTemplate> {
    const response = await api.patch<ClinicalDocumentTemplate>(
      `/clinical-records/document-templates/${id}`,
      payload,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clinical-records/document-templates/${id}`);
  },

  async apply(
    id: string,
    payload: ApplyDocumentTemplatePayload,
  ): Promise<{ id: string; kind: ClinicalDocumentTemplateKind; body: string }> {
    const response = await api.post<{
      id: string;
      kind: ClinicalDocumentTemplateKind;
      body: string;
    }>(`/clinical-records/document-templates/${id}/apply`, payload);
    return response.data;
  },
};
