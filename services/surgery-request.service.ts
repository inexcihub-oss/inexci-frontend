import api from "@/lib/api";
import { SurgeryRequestStatus } from "@/types/surgery-request.types";

// ── Tipos de Atividades ───────────────────────────────────────────────────────
export interface ActivityUser {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface Activity {
  id: string;
  type: "comment" | "status_change" | "system" | "pdf_generated";
  content: string;
  pdf_url?: string;
  created_at: string;
  user: ActivityUser | null;
}

// ── Tipos de Seções do Laudo ─────────────────────────────────────────────────

export interface ReportSection {
  id: string;
  title: string;
  description: string | null;
  order: number;
  surgery_request_id: string;
  created_at: string;
  updated_at: string;
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
  procedure_id: string;
  patient_id: string;
  manager_id: string;
  health_plan_id?: string;
  hospital_id?: string;
  priority: number;
}

export interface UpdateBasicDataPayload {
  priority?: number;
  deadline?: string | null;
  manager_id?: string;
}

// ─── Payloads de transição de status ──────────────────────────────────────────

export interface SendPayload {
  method: "email" | "download";
  to?: string;
  subject?: string;
  message?: string;
  notify_patient?: boolean;
}

export interface StartAnalysisPayload {
  request_number: string;
  received_at: string;
  notify_patient?: boolean;
  quotation_1_number?: string;
  quotation_1_received_at?: string;
  quotation_2_number?: string;
  quotation_2_received_at?: string;
  quotation_3_number?: string;
  quotation_3_received_at?: string;
  notes?: string;
}

export interface AcceptAuthorizationPayload {
  /** Mínimo 1, máximo 3 datas ISO no formato YYYY-MM-DDTHH:mm:ss */
  date_options: string[];
  notify_patient?: boolean;
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
  selected_date_index: 0 | 1 | 2;
  notify_patient?: boolean;
}

export interface UpdateDateOptionsPayload {
  date_options: string[];
}

export interface ReschedulePayload {
  new_date: string;
}

export interface MarkPerformedPayload {
  surgery_performed_at: string;
  notify_patient?: boolean;
}

export interface InvoicePayload {
  invoice_protocol: string;
  invoice_value: number;
  invoice_sent_at: string;
  set_as_default_for_health_plan?: boolean;
}

export interface ConfirmReceiptPayload {
  received_value: number;
  received_at: string;
  receipt_notes?: string;
}

export interface ContestPaymentPayload {
  to: string;
  subject: string;
  message: string;
  attachments?: string[];
}

export interface UpdateReceiptPayload {
  received_value: number;
  received_at: string;
}

export interface ClosePayload {
  reason?: string;
}

export interface NotifyPayload {
  template: string;
  to?: string;
}

export interface CreateTemplatePayload {
  name: string;
  template_data: object;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

export const surgeryRequestService = {
  // ── Consultas ──────────────────────────────────────────────────────────────

  /** Busca todos os procedimentos cirúrgicos */
  async getAll(): Promise<any> {
    const response = await api.get("/surgery-requests");
    return response.data;
  },

  /** Busca uma solicitação específica por ID */
  async getById(requestId: string): Promise<any> {
    const response = await api.get(`/surgery-requests/one?id=${requestId}`);
    return response.data;
  },

  // ── Criação e edição básica ────────────────────────────────────────────────

  /** Cria uma nova solicitação cirúrgica (payload completo) */
  async create(data: CreateSurgeryRequestPayload): Promise<any> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  /** Cria uma nova solicitação cirúrgica simplificada */
  async createSimple(data: SimpleSurgeryRequestPayload): Promise<any> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  /** Atualiza dados básicos (prioridade, prazo, gestor) */
  async updateBasicData(
    requestId: string,
    data: UpdateBasicDataPayload,
  ): Promise<any> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/basic`,
      data,
    );
    return response.data;
  },

  /** Atualiza dados genéricos do procedimento (laudo, etc.) */
  async update(requestId: string, data: any): Promise<any> {
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
  async send(requestId: string, data: SendPayload): Promise<any> {
    const response = await api.post(
      `/surgery-requests/${requestId}/send`,
      data,
    );
    return response.data;
  },

  /**
   * SENT (2) → IN_ANALYSIS (3)
   * Registra o início da análise pela operadora, com número e datas de cotação.
   */
  async startAnalysis(
    requestId: string,
    data: StartAnalysisPayload,
  ): Promise<any> {
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
    surgeryRequestId: string,
    procedures: { id: string; authorized_quantity: number }[],
    opmeItems: { id: string; authorized_quantity: number }[],
  ): Promise<any> {
    const response = await api.post("/surgery-requests/procedures/authorize", {
      surgery_request_id: surgeryRequestId,
      surgery_request_procedures: procedures,
      opme_items: opmeItems,
    });
    return response.data;
  },

  /**
   * IN_ANALYSIS (3) → IN_SCHEDULING (4)
   * Aceita a autorização e propõe datas disponíveis para a cirurgia.
   */
  async acceptAuthorization(
    requestId: string,
    data: AcceptAuthorizationPayload,
  ): Promise<any> {
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
    requestId: string,
    data: ContestAuthorizationPayload,
  ): Promise<any> {
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
  async confirmDate(requestId: string, data: ConfirmDatePayload): Promise<any> {
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
    requestId: string,
    data: UpdateDateOptionsPayload,
  ): Promise<any> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/date-options`,
      data,
    );
    return response.data;
  },

  /**
   * SCHEDULED (5) — sem mudança de status, reagenda a cirurgia.
   */
  async reschedule(requestId: string, data: ReschedulePayload): Promise<any> {
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
    requestId: string,
    data: MarkPerformedPayload,
  ): Promise<any> {
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
  async invoice(requestId: string, data: InvoicePayload): Promise<any> {
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
    requestId: string,
    data: ConfirmReceiptPayload,
  ): Promise<any> {
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
    requestId: string,
    data: ContestPaymentPayload,
  ): Promise<any> {
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
    requestId: string,
    data: UpdateReceiptPayload,
  ): Promise<any> {
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
  async close(requestId: string, data?: ClosePayload): Promise<any> {
    const response = await api.post(
      `/surgery-requests/${requestId}/close`,
      data ?? {},
    );
    return response.data;
  },

  // ── Notificações e templates ───────────────────────────────────────────────

  /** Envia notificação por e-mail manualmente */
  async notify(requestId: string, data: NotifyPayload): Promise<any> {
    const response = await api.post(
      `/surgery-requests/${requestId}/notify`,
      data,
    );
    return response.data;
  },

  /** Cria um template de solicitação */
  async createTemplate(data: CreateTemplatePayload): Promise<any> {
    const response = await api.post("/surgery-requests/templates", data);
    return response.data;
  },

  /** Lista todos os templates salvos */
  async getTemplates(): Promise<any> {
    const response = await api.get("/surgery-requests/templates");
    return response.data;
  },

  // ── Atividades ────────────────────────────────────────────────────────────

  /** Busca o histórico de atividades e comentários de uma solicitação */
  async getActivities(requestId: string): Promise<Activity[]> {
    const response = await api.get(`/surgery-requests/${requestId}/activities`);
    return response.data;
  },

  /** Adiciona um comentário/anotação à solicitação */
  async createActivity(requestId: string, content: string): Promise<Activity> {
    const response = await api.post(
      `/surgery-requests/${requestId}/activities`,
      { content, type: "comment" },
    );
    return response.data;
  },

  // ── Seções do laudo ───────────────────────────────────────────────────────

  /** Lista todas as seções do laudo ordenadas */
  async getSections(requestId: string): Promise<ReportSection[]> {
    const response = await api.get(`/surgery-requests/${requestId}/sections`);
    return response.data;
  },

  /** Cria uma nova seção no laudo */
  async createSection(
    requestId: string,
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
    requestId: string,
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
    requestId: string,
    sectionId: string,
  ): Promise<{ deleted: boolean }> {
    const response = await api.delete(
      `/surgery-requests/${requestId}/sections/${sectionId}`,
    );
    return response.data;
  },

  /** Reordena as seções do laudo */
  async reorderSections(
    requestId: string,
    ids: string[],
  ): Promise<ReportSection[]> {
    const response = await api.patch(
      `/surgery-requests/${requestId}/sections/reorder`,
      { ids },
    );
    return response.data;
  },
};
