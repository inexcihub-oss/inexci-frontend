import api from "@/lib/api";
import { Document } from "@/services/document.service";
import {
  SurgeryRequestStatus,
  EntityRef,
  DoctorRef,
  PatientRef,
  HospitalRef,
  HealthPlanRef,
  TussItemRef,
  OpmeItemRef,
  BillingInfo,
  ReceiptInfo,
  SchedulingInfo,
} from "@/types/surgery-request.types";

// Re-exporta sub-tipos para uso nos componentes
export type {
  EntityRef,
  DoctorRef,
  PatientRef,
  HospitalRef,
  HealthPlanRef,
  TussItemRef,
  OpmeItemRef,
  BillingInfo,
  ReceiptInfo,
  SchedulingInfo,
} from "@/types/surgery-request.types";

// ── Tipos de Atividades ───────────────────────────────────────────────────────
export interface ActivityUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Activity {
  id: string;
  type: "comment" | "status_change" | "system" | "pdf_generated";
  content: string;
  pdfUrl?: string;
  createdAt: string;
  user: ActivityUser | null;
}

// ── Tipos de Seções do Laudo ─────────────────────────────────────────────────

export interface ReportSection {
  id: string;
  title: string;
  description: string | null;
  order: number;
  surgeryRequestId: string;
  createdAt: string;
  updatedAt: string;
}

// Mapeamento de status string para número (conforme backend)
export const STATUS_MAP: Record<SurgeryRequestStatus, number> = {
  Pendente: 1,
  Enviada: 2,
  "Em Análise": 3,
  "Em Agendamento": 4,
  Agendada: 5,
  Realizada: 6,
  Faturada: 7,
  Finalizada: 8,
  Encerrada: 9,
};

// Mapeamento reverso: número para string
export const STATUS_NUMBER_TO_STRING: Record<number, SurgeryRequestStatus> = {
  1: "Pendente",
  2: "Enviada",
  3: "Em Análise",
  4: "Em Agendamento",
  5: "Agendada",
  6: "Realizada",
  7: "Faturada",
  8: "Finalizada",
  9: "Encerrada",
};

// Cores de status para UI
export const STATUS_COLORS: Record<
  SurgeryRequestStatus,
  { bg: string; text: string; border: string }
> = {
  Pendente: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  Enviada: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  "Em Análise": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  "Em Agendamento": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  Agendada: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  Realizada: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  Faturada: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  Finalizada: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  Encerrada: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

// ─── Payloads de criação/atualização básica ───────────────────────────────────

export interface CreateSurgeryRequestPayload {
  procedureId: string;
  patientId: string;
  hospitalId: string;
  healthPlanId?: string;
  managerId?: string;
  scheduledDate?: string;
  priority?: string;
  observations?: string;
}

export interface SimpleSurgeryRequestPayload {
  procedureId: string;
  patientId: string;
  doctorId: string;
  healthPlanId?: string;
  hospitalId?: string;
  priority: number | string;
  templateId?: string;
  requiredDocuments?: Array<{ type: string; name: string }>;
}

export interface UpdateBasicDataPayload {
  priority?: number;
}

// ─── Payloads de transição de status ──────────────────────────────────────────

export interface SendPayload {
  method: "email" | "download";
  to?: string;
  subject?: string;
  message?: string;
  notifyPatient?: boolean;
}

export interface StartAnalysisPayload {
  requestNumber: string;
  receivedAt: string;
  notifyPatient?: boolean;
  quotation1Number?: string;
  quotation1ReceivedAt?: string;
  quotation2Number?: string;
  quotation2ReceivedAt?: string;
  quotation3Number?: string;
  quotation3ReceivedAt?: string;
  notes?: string;
}

export interface AcceptAuthorizationPayload {
  /** Exatamente 3 datas ISO no formato YYYY-MM-DDTHH:mm:ss */
  dateOptions: string[];
  notifyPatient?: boolean;
}

export interface ContestAuthorizationPayload {
  reason: string;
  method: "email" | "document";
  to?: string;
  subject?: string;
  message?: string;
  attachments?: string[];
}

export interface ConfirmDatePayload {
  selectedDateIndex: 0 | 1 | 2;
  notifyPatient?: boolean;
}

export interface UpdateDateOptionsPayload {
  dateOptions: string[];
}

export interface ReschedulePayload {
  newDate: string;
}

export interface MarkPerformedPayload {
  surgeryPerformedAt: string;
  notifyPatient?: boolean;
}

export interface InvoicePayload {
  invoiceProtocol: string;
  invoiceValue: number;
  invoiceSentAt: string;
  paymentDeadline?: string;
  setAsDefaultForHealthPlan?: boolean;
}

export interface ConfirmReceiptPayload {
  receivedValue: number;
  receivedAt: string;
  receiptNotes?: string;
}

export interface ContestPaymentPayload {
  to: string;
  subject: string;
  message: string;
  attachments?: string[];
}

export interface UpdateReceiptPayload {
  receivedValue: number;
  receivedAt: string;
}

export interface ClosePayload {
  reason?: string;
}

export interface NotifyPayload {
  template: string;
  to?: string;
  /** Canais a enviar (quando não informado, o backend decide) */
  channels?: { email?: boolean; whatsapp?: boolean };
  /** Status anterior (numérico) para templates de mudança de status */
  oldStatus?: number;
}

export interface CreateTemplatePayload {
  name: string;
  templateData: object;
}

// ─── Tipos de resposta ────────────────────────────────────────────────────────

/** Registro resumido retornado na listagem (getAll) */
export interface SurgeryRequestListItem {
  id: number;
  status: number;
  protocol: string | null;
  priority: number;
  createdAt: string;
  surgeryDate: string | null;
  patient: { id: string; name: string } | null;
  doctor: { id: string; name: string } | null;
  healthPlan: { id: string; name: string } | null;
  healthPlanId?: string | null;
  hospital: { id: string; name: string } | null;
  hospitalId?: string | null;
  procedure: { id: string; name: string } | null;
  tussProcedure: { id: string; description: string } | null;
  procedureName?: string;
  pendenciesCount?: number;
  hasIncompletePayment?: boolean;
  [key: string]: unknown;
}

/** Resposta paginada da listagem */
export interface SurgeryRequestListResponse {
  total: number;
  records: SurgeryRequestListItem[];
}

/** Registro completo retornado pelo getById — inclui todas as relações */
export interface SurgeryRequestDetail {
  id: number;
  status: number;
  protocol: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  observations: string | null;
  procedureName?: string;
  // Relações tipadas
  patient: PatientRef | null;
  doctor: DoctorRef | null;
  hospital: HospitalRef | null;
  healthPlan: HealthPlanRef | null;
  procedure: EntityRef | null;
  tussProcedure: TussItemRef | null;
  // Arrays
  tussItems: TussItemRef[];
  opmeItems: OpmeItemRef[];
  documents: Document[];
  sections: ReportSection[];
  activities: Activity[];
  contestations: Record<string, unknown>[];
  pendencies: Record<string, unknown>[];
  // Objetos complexos
  analysis: Record<string, unknown> | null;
  billing: BillingInfo | null;
  receipt: ReceiptInfo | null;
  scheduling: SchedulingInfo | null;
  pendenciesSummary: {
    total: number;
    completed: number;
    pending: number;
    waiting: number;
    optional: number;
    canTransition: boolean;
  } | null;
  // Campos primitivos adicionais usados por componentes
  cidId: string | null;
  cidDescription: string | null;
  cid?: { id: string; code: string; description: string } | null;
  healthPlanRegistration: string | null;
  healthPlanType: string | null;
  hospitalId: string | number | null;
  healthPlanId: string | number | null;
  hasOpme: boolean | null;
  surgeryDate: string | null;
  surgeryPerformedAt: string | null;
  diagnosis: string | null;
  medicalReport: string | null;
  patientHistory: string | null;
  [key: string]: unknown;
}

/** Resposta genérica de mutação (create/update/transition) cujo retorno geralmente não é consumido */
export interface SurgeryRequestMutationResponse {
  id?: string | number;
  [key: string]: unknown;
}

/** Resposta do envio com download de PDF */
export interface SendResponse extends SurgeryRequestMutationResponse {
  pdfBase64?: string;
}

/** Template de solicitação salvo */
export interface SurgeryRequestTemplate {
  id: string;
  name: string;
  templateData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

export const surgeryRequestService = {
  // ── Consultas ──────────────────────────────────────────────────────────────

  /** Busca todos os procedimentos cirúrgicos */
  async getAll(): Promise<SurgeryRequestListResponse> {
    const response =
      await api.get<SurgeryRequestListResponse>("/surgery-requests");
    return response.data;
  },

  /** Busca cirurgias com data marcada (Agendada=5, Realizada=6, Faturada=7, Finalizada=8) */
  async getScheduled(): Promise<SurgeryRequestListResponse> {
    const response = await api.get<SurgeryRequestListResponse>(
      "/surgery-requests?status=5,6,7,8",
    );
    return response.data;
  },

  /** Busca uma solicitação específica por ID */
  async getById(requestId: string | number): Promise<SurgeryRequestDetail> {
    const response = await api.get<SurgeryRequestDetail>(
      `/surgery-requests/one?id=${requestId}`,
    );
    const data = response.data as SurgeryRequestDetail & {
      cidCode?: string | null;
    };
    // Backend serializa o campo como cidCode; normaliza para cidId esperado pelos componentes
    if (data.cidCode != null && !data.cidId) {
      data.cidId = data.cidCode;
    }
    return data;
  },

  // ── Criação e edição básica ────────────────────────────────────────────────

  /** Cria uma nova solicitação cirúrgica (payload completo) */
  async create(
    data: CreateSurgeryRequestPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  /** Cria uma nova solicitação cirúrgica simplificada */
  async createSimple(
    data: SimpleSurgeryRequestPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  /** Define se a solicitação possui OPME */
  async setHasOpme(requestId: string, hasOpme: boolean): Promise<void> {
    await api.patch(`/surgery-requests/${requestId}/has-opme`, {
      hasOpme,
    });
  },

  /** Atualiza dados básicos (prioridade) */
  async updateBasicData(
    requestId: string | number,
    data: UpdateBasicDataPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/basic`,
      data,
    );
    return response.data;
  },

  /** Atualiza dados genéricos do procedimento (laudo, etc.) */
  async update(
    requestId: string | number,
    data: Record<string, unknown>,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.put("/surgery-requests", {
      id: requestId,
      ...data,
    });
    return response.data;
  },

  // ── Transições de status ───────────────────────────────────────────────────

  /**
   * PENDING (1) → SENT (2)
   * Envia a solicitação ao convênio via e-mail ou download de PDF.
   */
  async send(
    requestId: string | number,
    data: SendPayload,
  ): Promise<SendResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/send`,
      data,
    );
    return response.data;
  },

  /**
   * Exporta o PDF da solicitação cirúrgica sem alterar o status.
   * Disponível para solicitações já enviadas (status ≥ 2).
   */
  async exportPdf(requestId: string | number): Promise<Blob> {
    const response = await api.get(
      `/surgery-requests/${requestId}/export-pdf`,
      { responseType: "arraybuffer" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  },

  /**
   * SENT (2) → IN_ANALYSIS (3)
   * Registra o início da análise pela operadora, com número e datas de cotação.
   */
  async startAnalysis(
    requestId: string | number,
    data: StartAnalysisPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/start-analysis`,
      data,
    );
    return response.data;
  },

  /**
   * Salva as quantidades autorizadas de procedimentos TUSS e OPME.
   * Deve ser chamado antes de acceptAuthorization.
   */
  async authorizeQuantities(
    surgeryRequestId: string | number,
    procedures: { id: string | number; authorizedQuantity: number }[],
    opmeItems: {
      id: string | number;
      authorizedQuantity: number;
      selectedSupplierId?: string;
    }[],
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests/procedures/authorize", {
      surgeryRequestId,
      surgeryRequestProcedures: procedures,
      opmeItems,
    });
    return response.data;
  },

  /**
   * IN_ANALYSIS (3) → IN_SCHEDULING (4)
   * Aceita a autorização e propõe datas disponíveis para a cirurgia.
   */
  async acceptAuthorization(
    requestId: string | number,
    data: AcceptAuthorizationPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/accept-authorization`,
      data,
    );
    return response.data;
  },

  /**
   * IN_ANALYSIS (3) — mantém status, cria contestação de autorização.
   */
  async contestAuthorization(
    requestId: string | number,
    data: ContestAuthorizationPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/contest-authorization`,
      data,
    );
    return response.data;
  },

  /**
   * IN_SCHEDULING (4) → SCHEDULED (5)
   * Confirma a data escolhida pelo convênio.
   */
  async confirmDate(
    requestId: string | number,
    data: ConfirmDatePayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/confirm-date`,
      data,
    );
    return response.data;
  },

  /**
   * IN_SCHEDULING (4) — sem mudança de status, atualiza as opções de datas.
   */
  async updateDateOptions(
    requestId: string | number,
    data: UpdateDateOptionsPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/date-options`,
      data,
    );
    return response.data;
  },

  /**
   * SCHEDULED (5) — sem mudança de status, reagenda a cirurgia.
   */
  async reschedule(
    requestId: string | number,
    data: ReschedulePayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/reschedule`,
      data,
    );
    return response.data;
  },

  /**
   * SCHEDULED (5) → PERFORMED (6)
   * Marca a cirurgia como realizada, com data/hora da realização.
   */
  async markPerformed(
    requestId: string | number,
    data: MarkPerformedPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/mark-performed`,
      data,
    );
    return response.data;
  },

  /**
   * PERFORMED (6) → INVOICED (7)
   * Registra o faturamento enviado ao convênio.
   */
  async invoice(
    requestId: string | number,
    data: InvoicePayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/invoice`,
      data,
    );
    return response.data;
  },

  /**
   * INVOICED (7) → FINALIZED (8)
   * Confirma o recebimento do pagamento.
   */
  async confirmReceipt(
    requestId: string | number,
    data: ConfirmReceiptPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/confirm-receipt`,
      data,
    );
    return response.data;
  },

  /**
   * FINALIZED (8) — sem mudança de status, contesta o pagamento recebido.
   */
  async contestPayment(
    requestId: string | number,
    data: ContestPaymentPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/contest-payment`,
      data,
    );
    return response.data;
  },

  /**
   * FINALIZED (8) — edita os dados do recebimento após contestação.
   */
  async updateReceipt(
    requestId: string | number,
    data: UpdateReceiptPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/billing/receipt`,
      data,
    );
    return response.data;
  },

  /**
   * Qualquer status (exceto 8 - Finalizada e 9 - Encerrada) → CLOSED (9)
   * Encerra a solicitação com motivo opcional.
   */
  async close(
    requestId: string | number,
    data?: ClosePayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/close`,
      data ?? {},
    );
    return response.data;
  },

  // ── Notificações e templates ───────────────────────────────────────────────

  /** Envia notificação por e-mail manualmente */
  async notify(
    requestId: string | number,
    data: NotifyPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post(
      `/surgery-requests/${requestId}/notify`,
      data,
    );
    return response.data;
  },

  /** Cria um template de solicitação */
  async createTemplate(
    data: CreateTemplatePayload,
  ): Promise<SurgeryRequestTemplate> {
    const response = await api.post<SurgeryRequestTemplate>(
      "/surgery-requests/templates",
      data,
    );
    return response.data;
  },

  /** Lista todos os templates salvos */
  async getTemplates(): Promise<SurgeryRequestTemplate[]> {
    const response = await api.get<SurgeryRequestTemplate[]>(
      "/surgery-requests/templates",
    );
    return response.data;
  },

  /** Deleta um template de solicitação */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/surgery-requests/templates/${id}`);
  },

  /** Atualiza um template de solicitação */
  async updateTemplate(
    id: string,
    data: { name?: string; templateData?: object },
  ): Promise<SurgeryRequestTemplate> {
    const response = await api.patch<SurgeryRequestTemplate>(
      `/surgery-requests/templates/${id}`,
      data,
    );
    return response.data;
  },

  /** Incrementa o contador de uso de um template */
  async incrementTemplateUsage(id: string): Promise<SurgeryRequestTemplate> {
    const response = await api.post<SurgeryRequestTemplate>(
      `/surgery-requests/templates/${id}/increment-usage`,
    );
    return response.data;
  },

  // ── Downloads de PDF ────────────────────────────────────────────────────

  async downloadContestAuthorizationPdf(
    requestId: string | number,
  ): Promise<Blob> {
    const response = await api.get(
      `/surgery-requests/${requestId}/contest-authorization-pdf`,
      { responseType: "arraybuffer" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  },

  // ── Atividades ────────────────────────────────────────────────────────────

  /** Busca o histórico de atividades e comentários de uma solicitação */
  async getActivities(requestId: string | number): Promise<Activity[]> {
    const response = await api.get(`/surgery-requests/${requestId}/activities`);
    return response.data;
  },

  /** Adiciona um comentário/anotação à solicitação */
  async createActivity(
    requestId: string | number,
    content: string,
  ): Promise<Activity> {
    const response = await api.post(
      `/surgery-requests/${requestId}/activities`,
      { content, type: "comment" },
    );
    return response.data;
  },

  // ── Seções do laudo ───────────────────────────────────────────────────────

  /** Lista todas as seções do laudo ordenadas */
  async getSections(requestId: string | number): Promise<ReportSection[]> {
    const response = await api.get(`/surgery-requests/${requestId}/sections`);
    return response.data;
  },

  /** Cria uma nova seção no laudo */
  async createSection(
    requestId: string | number,
    data: { title: string; description?: string },
  ): Promise<ReportSection> {
    const response = await api.post(
      `/surgery-requests/${requestId}/sections`,
      data,
    );
    return response.data;
  },

  /** Atualiza título e/ou descrição de uma seção */
  async updateSection(
    requestId: string | number,
    sectionId: string,
    data: { title?: string; description?: string },
  ): Promise<ReportSection> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/sections/${sectionId}`,
      data,
    );
    return response.data;
  },

  /** Remove uma seção do laudo */
  async deleteSection(
    requestId: string | number,
    sectionId: string,
  ): Promise<{ deleted: boolean }> {
    const response = await api.delete(
      `/surgery-requests/${requestId}/sections/${sectionId}`,
    );
    return response.data;
  },

  /** Reordena as seções do laudo */
  async reorderSections(
    requestId: string | number,
    ids: string[],
  ): Promise<ReportSection[]> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/sections/reorder`,
      { ids },
    );
    return response.data;
  },
};
