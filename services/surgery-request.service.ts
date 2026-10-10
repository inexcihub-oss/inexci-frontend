import api, { FETCH_ALL_TAKE } from "@/lib/api";
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
  ExtractFromDocumentQueuedResponse,
  ExtractFromDocumentJobStatusResponse,
  CreateFromDocumentPayload,
  CreateFromDocumentResponse,
} from "@/types/surgery-request.types";
import { ALL_STATUS_CODES, STATUS_META } from "@/lib/surgery-request-status";

export interface ApplyDocumentExtractionPayload {
  procedure?: boolean; hospital?: boolean; healthPlan?: boolean; report?: boolean; tuss?: boolean; opme?: boolean;
  procedureName?: string; hospitalName?: string; healthPlanName?: string; healthPlanNumber?: string; notes?: string;
  sections?: { title: string; description?: string }[];
  tussItems?: { tussCode: string; name?: string; quantity?: number }[];
  opmeItems?: { description: string; qty: number; supplier?: string; manufacturer?: string }[];
  suggestedSuppliers?: string[]; tempStoragePath?: string; originalFileName?: string;
}

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

export interface ActivityUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ActivityMention {
  id: string;
  name: string;
}

export interface MentionableUser {
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
  mentions?: ActivityMention[];
}

export interface ReportSection {
  id: string;
  title: string;
  description: string | null;
  order: number;
  surgeryRequestId: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_NUMBER_TO_STRING: Record<number, SurgeryRequestStatus> =
  Object.fromEntries(
    ALL_STATUS_CODES.map((code) => [code, STATUS_META[code].label]),
  );

export const STATUS_COLORS: Record<
  SurgeryRequestStatus,
  { bg: string; text: string; border: string }
> = Object.fromEntries(
  ALL_STATUS_CODES.map((code) => [STATUS_META[code].label, STATUS_META[code].badge]),
) as Record<SurgeryRequestStatus, { bg: string; text: string; border: string }>;

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
  doctorId?: string;
}

export interface SendPayload {
  method: "email" | "download" | "document";
  to?: string;
  subject?: string;
  message?: string;
  cc?: string;
  notifyPatient?: boolean;
  useSourceDocument?: boolean;
  sentAt?: string;
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
  dateOptions?: string[];
  notifyPatient?: boolean;
}

export interface ContestAuthorizationPayload {
  reason: string;
  method: "email" | "document";
  to?: string;
  subject?: string;
  message?: string;
  cc?: string;
  attachments?: string[];
}

export interface ConfirmDatePayload {
  selectedDateIndex: 0 | 1 | 2;
  notifyPatient?: boolean;
}

export interface UpdateDateOptionsPayload {
  dateOptions: string[];
  notifyPatient?: boolean;
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
  invoiceNotes?: string;
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
  channels?: { email?: boolean; whatsapp?: boolean };
  oldStatus?: number;
}

export interface CreateTemplatePayload {
  name: string;
  templateData: object;
}

export interface SurgeryRequestListItem {
  id: number;
  status: number;
  protocol: string | null;
  priority: number;
  createdAt: string;
  lastStatusChangedAt?: string | null;
  updatedAt?: string;
  surgeryDate: string | null;
  isIndication?: boolean;
  indicationName?: string | null;
  patient: { id: string; name: string } | null;
  doctor: { id: string; name: string } | null;
  healthPlan: { id: string; name: string } | null;
  healthPlanId?: string | null;
  hospital?: { id: string; name: string } | null;
  hospitalId?: string | null;
  procedure: { id: string; name: string } | null;
  suppliers?: Array<{ id: string; name: string }>;
  clinic?: { id: string; name: string } | null;
  pendenciesCount?: number;
  totalPendencies?: number;
  canAdvance?: boolean;
  hasIncompletePayment?: boolean;
}

export interface SurgeryRequestListResponse {
  total: number;
  records: SurgeryRequestListItem[];
}

export interface SurgeryRequestDetail {
  id: number;
  status: number;
  protocol: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
  observations: string | null;
  procedureName?: string;
  patient: PatientRef | null;
  doctor: DoctorRef | null;
  hospital: HospitalRef | null;
  healthPlan: HealthPlanRef | null;
  procedure: EntityRef | null;
  tussProcedure: TussItemRef | null;
  tussItems: TussItemRef[];
  opmeItems: OpmeItemRef[];
  documents: Document[];
  sections: ReportSection[];
  activities: Activity[];
  contestations: Record<string, unknown>[];
  pendencies: Record<string, unknown>[];
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
  cid: { code: string; description: string } | null;
  healthPlanName: string | null;
  healthPlanRegistration: string | null;
  healthPlanType: string | null;
  hospitalId: string | number | null;
  healthPlanId: string | number | null;
  hasOpme: boolean | null;
  surgeryDate: string | null;
  dateOptions?: string[];
  selectedDateIndex?: number | null;
  surgeryPerformedAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  [key: string]: unknown;
}

export interface SurgeryRequestMutationResponse {
  id?: string | number;
  [key: string]: unknown;
}

export interface SendResponse extends SurgeryRequestMutationResponse {
  pdfBase64?: string;
}

export interface TemplateEntityRef {
  id: string;
  name: string;
}

export interface SurgeryRequestTemplateData {
  procedure?: TemplateEntityRef;
  procedureName?: string;
  hospital?: TemplateEntityRef;
  healthPlan?: TemplateEntityRef;
  priority?: number;
  tussItems?: { tussCode: string; name: string; quantity: number }[];
  opmeItems?: {
    name: string;
    quantity: number;
    manufacturers: string[];
    suppliers: string[];
  }[];
  requiredDocuments?: { type: string; name: string }[];
}

export interface SurgeryRequestTemplateSummary {
  id: string;
  name: string;
  procedureId: string | null;
  procedureName: string | null;
  hospitalId: string | null;
  hospitalName: string | null;
  healthPlanId: string | null;
  healthPlanName: string | null;
  priority: number | null;
  doctorName: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SurgeryRequestTemplate {
  id: string;
  name: string;
  templateData: SurgeryRequestTemplateData;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncrementTemplateUsageResponse {
  id: string;
  usageCount: number;
}

export const surgeryRequestService = {
  async getKanban(): Promise<SurgeryRequestListResponse> {
    const response = await api.get<SurgeryRequestListResponse>(
      "/surgery-requests/kanban",
    );
    return response.data;
  },

  async getAll(params?: {
    patientId?: string;
    hospitalId?: string;
    healthPlanId?: string;
    doctorId?: string;
  }): Promise<SurgeryRequestListResponse> {
    const filters: Record<string, string> = {};
    if (params?.patientId) filters.patientId = params.patientId;
    if (params?.hospitalId) filters.hospitalId = params.hospitalId;
    if (params?.healthPlanId) filters.healthPlanId = params.healthPlanId;
    if (params?.doctorId) filters.doctorId = params.doctorId;

    const response = await api.get<SurgeryRequestListResponse>(
      "/surgery-requests",
      { params: { take: FETCH_ALL_TAKE, ...filters } },
    );
    return response.data;
  },

  async getAgenda(
    from: string,
    to: string,
  ): Promise<SurgeryRequestListResponse> {
    const response = await api.get<SurgeryRequestListResponse>(
      "/surgery-requests/agenda",
      { params: { from, to } },
    );
    return response.data;
  },

  async getById(requestId: string | number): Promise<SurgeryRequestDetail> {
    const response = await api.get<SurgeryRequestDetail>(
      `/surgery-requests/one?id=${requestId}`,
    );
    return response.data;
  },

  async create(
    data: CreateSurgeryRequestPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  async createSimple(
    data: SimpleSurgeryRequestPayload,
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests", data);
    return response.data;
  },

  async setHasOpme(requestId: string, hasOpme: boolean): Promise<void> {
    await api.patch(`/surgery-requests/${requestId}/has-opme`, {
      hasOpme,
    });
  },

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

  async getCcRecipients(
    requestId: string | number,
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    const response = await api.get(
      `/surgery-requests/${requestId}/cc-recipients`,
    );
    return response.data;
  },

  async exportPdf(requestId: string | number): Promise<Blob> {
    const response = await api.get(
      `/surgery-requests/${requestId}/export-pdf`,
      { responseType: "arraybuffer" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  },

  async medicalReportPdf(requestId: string | number): Promise<Blob> {
    const response = await api.get(
      `/surgery-requests/${requestId}/medical-report-pdf`,
      { responseType: "arraybuffer" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  },

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

  async authorizeQuantities(
    surgeryRequestId: string | number,
    procedures: { id: string | number; authorizedQuantity: number }[],
    opmeItems: {
      id: string | number;
      authorizedQuantity: number;
      selectedSupplierId?: string;
      selectedSupplierIsGeneric?: boolean;
    }[],
  ): Promise<SurgeryRequestMutationResponse> {
    const response = await api.post("/surgery-requests/procedures/authorize", {
      surgeryRequestId,
      surgeryRequestProcedures: procedures,
      opmeItems,
    });
    return response.data;
  },

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

  async createTemplate(
    data: CreateTemplatePayload,
  ): Promise<SurgeryRequestTemplate> {
    const response = await api.post<SurgeryRequestTemplate>(
      "/surgery-requests/templates",
      data,
    );
    return response.data;
  },

  async getTemplates(): Promise<SurgeryRequestTemplateSummary[]> {
    const response = await api.get<SurgeryRequestTemplateSummary[]>(
      "/surgery-requests/templates",
    );
    return response.data;
  },

  async getTemplate(id: string): Promise<SurgeryRequestTemplate> {
    const response = await api.get<SurgeryRequestTemplate>(
      `/surgery-requests/templates/${id}`,
    );
    return response.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/surgery-requests/templates/${id}`);
  },

  async deleteTemplates(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await api.post("/surgery-requests/templates/bulk-delete", { ids });
  },

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

  async incrementTemplateUsage(
    id: string,
  ): Promise<IncrementTemplateUsageResponse> {
    const response = await api.post<IncrementTemplateUsageResponse>(
      `/surgery-requests/templates/${id}/increment-usage`,
    );
    return response.data;
  },

  async downloadContestAuthorizationPdf(
    requestId: string | number,
  ): Promise<Blob> {
    const response = await api.get(
      `/surgery-requests/${requestId}/contest-authorization-pdf`,
      { responseType: "arraybuffer" },
    );
    return new Blob([response.data], { type: "application/pdf" });
  },

  async getActivities(requestId: string | number): Promise<Activity[]> {
    const response = await api.get(`/surgery-requests/${requestId}/activities`);
    return response.data;
  },

  async createActivity(
    requestId: string | number,
    content: string,
    mentionedUserIds?: string[],
  ): Promise<Activity> {
    const response = await api.post(
      `/surgery-requests/${requestId}/activities`,
      {
        content,
        type: "comment",
        ...(mentionedUserIds && mentionedUserIds.length > 0
          ? { mentionedUserIds }
          : {}),
      },
    );
    return response.data;
  },

  async getMentionableUsers(
    requestId: string | number,
  ): Promise<MentionableUser[]> {
    const response = await api.get<MentionableUser[]>(
      `/surgery-requests/${requestId}/activities/mentionable-users`,
    );
    return response.data;
  },

  async getSections(requestId: string | number): Promise<ReportSection[]> {
    const response = await api.get(`/surgery-requests/${requestId}/sections`);
    return response.data;
  },

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

  async deleteSection(
    requestId: string | number,
    sectionId: string,
  ): Promise<{ deleted: boolean }> {
    const response = await api.delete(
      `/surgery-requests/${requestId}/sections/${sectionId}`,
    );
    return response.data;
  },

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

  async extractFromDocument(
    file: File,
    options?: { notifyOnCompletion?: boolean; surgeryRequestId?: number | string },
  ): Promise<ExtractFromDocumentQueuedResponse> {
    const formData = new FormData();
    formData.append("document", file);
    if (options?.notifyOnCompletion === false) {
      formData.append("notifyOnCompletion", "false");
    }
    if (options?.surgeryRequestId !== undefined) {
      formData.append("surgeryRequestId", String(options.surgeryRequestId));
    }
    const response = await api.post<ExtractFromDocumentQueuedResponse>(
      "/surgery-requests/extract-from-document",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  async getExtractFromDocumentStatus(
    jobId: string,
  ): Promise<ExtractFromDocumentJobStatusResponse> {
    const response = await api.get<ExtractFromDocumentJobStatusResponse>(
      `/surgery-requests/extract-from-document/${jobId}`,
    );
    return response.data;
  },

  async createFromDocument(
    payload: CreateFromDocumentPayload,
  ): Promise<CreateFromDocumentResponse> {
    const response = await api.post<CreateFromDocumentResponse>(
      "/surgery-requests/from-document",
      payload,
    );
    return response.data;
  },

  async applyDocumentExtraction(
    requestId: string | number,
    data: ApplyDocumentExtractionPayload,
  ): Promise<{ warnings: string[] }> {
    const response = await api.post(
      `/surgery-requests/${requestId}/apply-document-extraction`,
      data,
    );
    return response.data;
  },
};
