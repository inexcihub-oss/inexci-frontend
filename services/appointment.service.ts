import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

export type AppointmentType = "first_visit" | "return" | "follow_up";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export const OCCUPYING_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "waiting",
  "in_progress",
  "completed",
];

export function ocupaAgenda(status: AppointmentStatus): boolean {
  return OCCUPYING_APPOINTMENT_STATUSES.includes(status);
}

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  first_visit: "Primeira consulta",
  return: "Retorno",
  follow_up: "Acompanhamento",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  waiting: "Aguardando",
  in_progress: "Em atendimento",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Faltou",
};

export interface Appointment {
  warnings?: string[];
  id: string;
  doctorId: string;
  patientId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  durationMinutes: number;
  notes: string | null;
  cancellationReason: string | null;
  patient?: { id: string; name: string } | null;
  clinicId: string | null;
  clinic?: { id: string; name: string } | null;
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  isWalkIn?: boolean;
  healthPlanId?: string | null;
  healthPlan?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
  clinicalRecordStatus?: ClinicalRecordStatus | null;
}

interface BackendAppointment {
  warnings?: string[];
  id: string;
  doctorId: string;
  patientId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string | Date;
  durationMinutes: number;
  notes: string | null;
  cancellationReason: string | null;
  patient?: { id: string; name: string } | null;
  clinicId: string | null;
  clinic?: { id: string; name: string } | null;
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  isWalkIn?: boolean;
  healthPlanId?: string | null;
  healthPlan?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
  clinicalRecordStatus?: ClinicalRecordStatus | null;
}

export type ClinicalRecordStatus = "draft" | "finalized";

export function rotuloDoAtendimento(
  a: Pick<Appointment, "status" | "clinicalRecordStatus">,
): "Ver atendimento" | "Continuar atendimento" | "Iniciar atendimento" {
  if (a.status === "completed" || a.clinicalRecordStatus === "finalized")
    return "Ver atendimento";
  if (a.clinicalRecordStatus === "draft") return "Continuar atendimento";
  if (a.clinicalRecordStatus === null) return "Iniciar atendimento";
  return a.status === "in_progress"
    ? "Continuar atendimento"
    : "Iniciar atendimento";
}

function mapAppointment(a: BackendAppointment): Appointment {
  return {
    id: a.id,
    doctorId: a.doctorId,
    patientId: a.patientId,
    type: a.type,
    status: a.status,
    scheduledAt:
      typeof a.scheduledAt === "string"
        ? a.scheduledAt
        : new Date(a.scheduledAt).toISOString(),
    durationMinutes: a.durationMinutes,
    notes: a.notes,
    cancellationReason: a.cancellationReason,
    patient: a.patient ?? null,
    clinicId: a.clinicId ?? null,
    clinic: a.clinic ?? null,
    roomId: a.roomId ?? null,
    room: a.room ?? null,
    isWalkIn: a.isWalkIn ?? false,
    healthPlanId: a.healthPlanId ?? null,
    healthPlan: a.healthPlan ?? null,
    createdBy: a.createdBy ?? null,
    ...(a.clinicalRecordStatus !== undefined
      ? { clinicalRecordStatus: a.clinicalRecordStatus }
      : {}),
    ...(a.warnings?.length ? { warnings: a.warnings } : {}),
  };
}

export type AppointmentActivityType =
  | "created"
  | "status_change"
  | "rescheduled"
  | "updated"
  | "comment"
  | "system";

export interface AppointmentActivity {
  id: string;
  type: AppointmentActivityType;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus | null;
  content: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  type?: AppointmentType;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
  clinicId?: string | null;
  roomId?: string | null;
  isWalkIn?: boolean;
  healthPlanId?: string | null;
}

export type UpdateAppointmentPayload = Partial<
  Pick<
    CreateAppointmentPayload,
    | "type"
    | "scheduledAt"
    | "durationMinutes"
    | "notes"
    | "clinicId"
    | "roomId"
    | "isWalkIn"
    | "healthPlanId"
  >
>;

export interface AgendaQuery {
  from?: string;
  to?: string;
  doctorId?: string;
  status?: AppointmentStatus[];
  order?: "ASC" | "DESC";
  doctorIds?: string[];
  skip?: number;
  take?: number;
  withDoctorCounts?: boolean;
}

export interface AgendaPage {
  records: Appointment[];
  total: number;
  countByDoctorId?: Record<string, number>;
}

export const AGENDA_MAX_PAGINAS = 20;

export const appointmentService = {
  async getAgendaPage(query: AgendaQuery = {}): Promise<AgendaPage> {
    const params: Record<string, string> = {};
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    if (query.doctorId) params.doctorId = query.doctorId;
    if (query.status?.length) params.status = query.status.join(",");
    if (query.order) params.order = query.order;
    if (query.doctorIds?.length) params.doctorIds = query.doctorIds.join(",");
    if (query.skip) params.skip = String(query.skip);
    if (query.take) params.take = String(query.take);
    if (query.withDoctorCounts) params.withDoctorCounts = "true";

    const response = await api.get("/appointments", { params });
    const records = getApiRecords<BackendAppointment>(response.data).map(
      mapAppointment,
    );
    const total = (response.data as { total?: number } | undefined)?.total;

    return {
      records,
      total: typeof total === "number" ? total : records.length,
      countByDoctorId: (
        response.data as { countByDoctorId?: Record<string, number> } | undefined
      )?.countByDoctorId,
    };
  },

  async getAgendaCompleta(
    query: Omit<AgendaQuery, "skip" | "take"> = {},
  ): Promise<AgendaPage> {
    const primeira = await this.getAgendaPage({ ...query, take: FETCH_ALL_TAKE });
    const records = [...primeira.records];
    let paginas = 1;
    while (records.length < primeira.total && paginas < AGENDA_MAX_PAGINAS) {
      const pagina = await this.getAgendaPage({
        ...query,
        skip: records.length,
        take: FETCH_ALL_TAKE,
      });
      paginas += 1;
      if (pagina.records.length === 0) break;
      records.push(...pagina.records);
    }
    return { ...primeira, records };
  },

  async getAgenda(query: AgendaQuery = {}): Promise<Appointment[]> {
    const { records } = await this.getAgendaPage(query);
    return records;
  },

  async getByPatient(patientId: string): Promise<Appointment[]> {
    const response = await api.get(`/appointments/patient/${patientId}`);
    return getApiRecords<BackendAppointment>(response.data).map(mapAppointment);
  },

  async getById(id: string): Promise<Appointment> {
    const response = await api.get<BackendAppointment>(`/appointments/${id}`);
    return mapAppointment(response.data);
  },

  async create(payload: CreateAppointmentPayload): Promise<Appointment> {
    const response = await api.post<BackendAppointment>(
      "/appointments",
      payload,
    );
    return mapAppointment(response.data);
  },

  async update(
    id: string,
    payload: UpdateAppointmentPayload,
  ): Promise<Appointment> {
    const response = await api.patch<BackendAppointment>(
      `/appointments/${id}`,
      payload,
    );
    return mapAppointment(response.data);
  },

  async updateStatus(
    id: string,
    status: AppointmentStatus,
    cancellationReason?: string,
  ): Promise<Appointment> {
    const response = await api.patch<BackendAppointment>(
      `/appointments/${id}/status`,
      { status, ...(cancellationReason ? { cancellationReason } : {}) },
    );
    return mapAppointment(response.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/appointments/${id}`);
  },

  async listActivities(id: string): Promise<AppointmentActivity[]> {
    const response = await api.get<AppointmentActivity[]>(
      `/appointments/${id}/activities`,
    );
    return response.data ?? [];
  },

  async addComment(id: string, content: string): Promise<AppointmentActivity> {
    const response = await api.post<AppointmentActivity>(
      `/appointments/${id}/activities`,
      { content },
    );
    return response.data;
  },
};
