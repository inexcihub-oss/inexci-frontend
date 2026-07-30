import api from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

// ── Enums (espelham o backend) ────────────────────────────────────────────────

export type AppointmentType = "first_visit" | "return" | "follow_up";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  first_visit: "Primeira consulta",
  return: "Retorno",
  follow_up: "Acompanhamento",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Realizada",
  cancelled: "Cancelada",
  no_show: "Faltou",
};

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Appointment {
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
}

interface BackendAppointment {
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
  };
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  type?: AppointmentType;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}

export type UpdateAppointmentPayload = Partial<
  Pick<
    CreateAppointmentPayload,
    "type" | "scheduledAt" | "durationMinutes" | "notes"
  >
>;

/**
 * Recorte da agenda. `from`/`to` são opcionais e independentes: a agenda passa
 * as duas, a aba "Próximas" só o início (não tem teto) e a aba "Realizadas"
 * nenhuma (todo o histórico, filtrado por status).
 */
export interface AgendaQuery {
  from?: string;
  to?: string;
  doctorId?: string;
  /** Status aceitos. Sem isso, vêm todos. */
  status?: AppointmentStatus[];
  /** Ordem por horário — `DESC` nas listas de passado. */
  order?: "ASC" | "DESC";
}

export const appointmentService = {
  /** Consultas da agenda, opcionalmente recortadas por data e status. */
  async getAgenda(query: AgendaQuery = {}): Promise<Appointment[]> {
    const params: Record<string, string> = {};
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    if (query.doctorId) params.doctorId = query.doctorId;
    if (query.status?.length) params.status = query.status.join(",");
    if (query.order) params.order = query.order;

    const response = await api.get("/appointments", { params });
    return getApiRecords<BackendAppointment>(response.data).map(mapAppointment);
  },

  /** Histórico completo de consultas de um paciente (aba Consultas / timeline). */
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
};
