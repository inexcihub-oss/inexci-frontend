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

export const appointmentService = {
  /** Consultas dentro de um intervalo de datas (agenda). */
  async getAgenda(
    from: string,
    to: string,
    doctorId?: string,
  ): Promise<Appointment[]> {
    const response = await api.get("/appointments", {
      params: { from, to, ...(doctorId ? { doctorId } : {}) },
    });
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
