import api from "@/lib/api";

/** Período da grade semanal de um profissional (MIG-05). */
export interface DoctorSchedule {
  id: string;
  doctorId: string;
  clinicId: string | null;
  roomId: string | null;
  clinic?: { id: string; name: string } | null;
  room?: { id: string; name: string } | null;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
  /** `HH:MM:SS`, horário de São Paulo. */
  startTime: string;
  endTime: string;
  slotMinutes: number;
  maxWalkIns: number | null;
  validFrom: string | null;
  validTo: string | null;
  active: boolean;
}

export interface DoctorSchedulePayload {
  doctorId?: string;
  clinicId?: string | null;
  roomId?: string | null;
  weekday?: number;
  /** `HH:MM`. */
  startTime?: string;
  endTime?: string;
  slotMinutes?: number;
  maxWalkIns?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  active?: boolean;
}

/** Bloqueio de agenda. `doctorId` nulo = toda a clínica. */
export interface ScheduleBlock {
  id: string;
  doctorId: string | null;
  clinicId: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  reason: string | null;
}

export interface ScheduleBlockPayload {
  doctorId?: string | null;
  clinicId?: string | null;
  startsAt?: string;
  endsAt?: string;
  allDay?: boolean;
  reason?: string | null;
}

export interface Holiday {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  date: string;
  recurring: boolean;
  blocksAgenda: boolean;
}

export interface HolidayPayload {
  name?: string;
  date?: string;
  recurring?: boolean;
  blocksAgenda?: boolean;
}

export type SlotReason = "appointment" | "block" | "holiday";

export interface AvailabilitySlot {
  start: string;
  end: string;
  free: boolean;
  reason?: SlotReason;
  /** Clínica/sala do período da grade (null = grade sem local). */
  clinicId?: string | null;
  roomId?: string | null;
}

export interface AvailabilityDay {
  date: string;
  holiday: { name: string; blocksAgenda: boolean } | null;
  slots: AvailabilitySlot[];
}

export const availabilityService = {
  async getSchedules(doctorId: string): Promise<DoctorSchedule[]> {
    const r = await api.get<DoctorSchedule[]>("/availability/schedules", {
      params: { doctorId },
    });
    return Array.isArray(r.data) ? r.data : [];
  },
  async createSchedule(payload: DoctorSchedulePayload): Promise<DoctorSchedule> {
    return (await api.post<DoctorSchedule>("/availability/schedules", payload))
      .data;
  },
  async updateSchedule(
    id: string,
    payload: DoctorSchedulePayload,
  ): Promise<DoctorSchedule> {
    return (
      await api.patch<DoctorSchedule>(`/availability/schedules/${id}`, payload)
    ).data;
  },
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/availability/schedules/${id}`);
  },

  async getBlocks(params: {
    from: string;
    to: string;
    doctorId?: string;
  }): Promise<ScheduleBlock[]> {
    const r = await api.get<ScheduleBlock[]>("/availability/blocks", {
      params,
    });
    return Array.isArray(r.data) ? r.data : [];
  },
  async createBlock(payload: ScheduleBlockPayload): Promise<ScheduleBlock> {
    return (await api.post<ScheduleBlock>("/availability/blocks", payload))
      .data;
  },
  async updateBlock(
    id: string,
    payload: ScheduleBlockPayload,
  ): Promise<ScheduleBlock> {
    return (
      await api.patch<ScheduleBlock>(`/availability/blocks/${id}`, payload)
    ).data;
  },
  async deleteBlock(id: string): Promise<void> {
    await api.delete(`/availability/blocks/${id}`);
  },

  async getHolidays(year?: number): Promise<Holiday[]> {
    const r = await api.get<Holiday[]>("/availability/holidays", {
      params: year ? { year } : {},
    });
    return Array.isArray(r.data) ? r.data : [];
  },
  async createHoliday(payload: HolidayPayload): Promise<Holiday> {
    return (await api.post<Holiday>("/availability/holidays", payload)).data;
  },
  async updateHoliday(id: string, payload: HolidayPayload): Promise<Holiday> {
    return (await api.patch<Holiday>(`/availability/holidays/${id}`, payload))
      .data;
  },
  async deleteHoliday(id: string): Promise<void> {
    await api.delete(`/availability/holidays/${id}`);
  },

  /** Horários da grade com ocupação, por dia (`YYYY-MM-DD`). */
  async getSlots(params: {
    doctorId: string;
    from: string;
    to: string;
  }): Promise<AvailabilityDay[]> {
    const r = await api.get<AvailabilityDay[]>("/availability/slots", {
      params,
    });
    return Array.isArray(r.data) ? r.data : [];
  },
};
