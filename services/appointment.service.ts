import api, { FETCH_ALL_TAKE } from "@/lib/api";
import { getApiRecords } from "@/lib/api-response";

// ── Enums (espelham o backend) ────────────────────────────────────────────────

export type AppointmentType = "first_visit" | "return" | "follow_up";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  /** Paciente chegou e aguarda na recepção. */
  | "waiting"
  /** Atendimento em andamento (a ficha foi aberta). */
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

/**
 * Status que ocupam o horário na agenda — espelho de
 * `OCCUPYING_APPOINTMENT_STATUSES` do backend (`appointment.entity.ts`).
 * Cancelada e falta não ocupam: não disputam horário, e a API não confere
 * bloqueio/feriado nem conflito ao remarcá-las.
 */
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

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Appointment {
  /** Avisos devolvidos ao criar/editar (ex.: `fora_da_grade`), sem impedir. */
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
  /** Sala dentro da clínica. */
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  /** Encaixe: marcado de propósito em cima de outro horário. */
  isWalkIn?: boolean;
  /** Convênio da consulta; `null` = particular. */
  healthPlanId?: string | null;
  healthPlan?: { id: string; name: string } | null;
  /** Quem agendou (ausente em consultas antigas). */
  createdBy?: { id: string; name: string } | null;
  /**
   * Situação da ficha vinculada: `draft` (em aberto), `finalized` ou `null`
   * (sem ficha). Só vem nas leituras (agenda, histórico, por id) — ausente
   * nas respostas de criar/editar.
   */
  clinicalRecordStatus?: ClinicalRecordStatus | null;
}

interface BackendAppointment {
  /** Só em criar/editar: avisos que não impedem salvar (ex.: `fora_da_grade`). */
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
  /** Sala dentro da clínica. */
  roomId?: string | null;
  room?: { id: string; name: string } | null;
  /** Encaixe: marcado de propósito em cima de outro horário. */
  isWalkIn?: boolean;
  /** Convênio da consulta; `null` = particular. */
  healthPlanId?: string | null;
  healthPlan?: { id: string; name: string } | null;
  /** Quem agendou (ausente em consultas antigas). */
  createdBy?: { id: string; name: string } | null;
  /**
   * Situação da ficha vinculada: `draft` (em aberto), `finalized` ou `null`
   * (sem ficha). Só vem nas leituras (agenda, histórico, por id) — ausente
   * nas respostas de criar/editar.
   */
  clinicalRecordStatus?: ClinicalRecordStatus | null;
}

/** Situação da ficha de atendimento vinculada à consulta. */
export type ClinicalRecordStatus = "draft" | "finalized";

/**
 * Rótulo da ação de atendimento. A ficha decide quando a API informa a
 * situação dela; o status da agenda é só o fallback (ele pode ser mexido à
 * mão e não acompanha a exclusão da ficha).
 */
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

/** O que aconteceu com a consulta (histórico). */
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
  /** Quem fez; `null` = sistema ou usuário excluído. */
  user: { id: string; name: string } | null;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  type?: AppointmentType;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
  /** Local de atendimento. `null` = consulta sem unidade definida. */
  clinicId?: string | null;
  /** Sala da clínica escolhida. `null` tira a sala. */
  roomId?: string | null;
  /** Encaixe: o backend não checa conflito de horário. */
  isWalkIn?: boolean;
  /** Convênio. `null` = particular. */
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
  /** Vários profissionais (filtro do hub). Vazio = todos os acessíveis. */
  doctorIds?: string[];
  /** Paginação. */
  skip?: number;
  take?: number;
  /** Pede `countByDoctorId` do recorte inteiro (sem paginação). */
  withDoctorCounts?: boolean;
}

/**
 * Resposta da agenda. `total` é a contagem real no banco; `records` pode vir
 * cortado pelo teto do backend (1000 itens). `total > records.length` é o
 * único sinal de que a lista está incompleta — a aba "Realizadas", que não
 * tem janela de datas, é a que pode encostar nesse teto.
 */
export interface AgendaPage {
  records: Appointment[];
  total: number;
  /** Consultas por profissional no recorte inteiro, quando pedido. */
  countByDoctorId?: Record<string, number>;
}

/**
 * Teto de páginas de `getAgendaCompleta` — trava contra laço infinito se o
 * servidor devolver `total` incoerente. 20 × 1000 consultas numa janela de
 * seis semanas está muito além de qualquer agenda real; passou disso, a tela
 * avisa que a lista veio cortada (`total > records.length`).
 */
export const AGENDA_MAX_PAGINAS = 20;

export const appointmentService = {
  /**
   * Consultas da agenda com a contagem real. Use quando for preciso saber se
   * a lista veio cortada; para só listar, `getAgenda` basta.
   */
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
      // Backend antigo (ou resposta em array puro) não manda `total`: cair
      // para `records.length` mantém a desigualdade falsa, ou seja, nenhum
      // aviso de corte — nunca um aviso inventado.
      total: typeof total === "number" ? total : records.length,
      countByDoctorId: (
        response.data as { countByDoctorId?: Record<string, number> } | undefined
      )?.countByDoctorId,
    };
  },

  /**
   * Todas as consultas do recorte, buscando página a página até `total`. O
   * backend corta cada resposta em `APPOINTMENTS_MAX_TAKE` (1000); a Agenda
   * não pode simplesmente parar na primeira página, senão some consulta da
   * tela sem aviso. Se ainda assim não couber (`AGENDA_MAX_PAGINAS`), devolve o
   * que conseguiu com o `total` real — quem chama avisa do corte.
   */
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
      // Página vazia antes do total (consulta removida no meio do caminho):
      // para em vez de pedir de novo o mesmo `skip`.
      if (pagina.records.length === 0) break;
      records.push(...pagina.records);
    }
    return { ...primeira, records };
  },

  /** Consultas da agenda, opcionalmente recortadas por data e status. */
  async getAgenda(query: AgendaQuery = {}): Promise<Appointment[]> {
    const { records } = await this.getAgendaPage(query);
    return records;
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

  /** Histórico da consulta, do mais antigo para o mais recente. */
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
