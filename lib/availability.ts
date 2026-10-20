import type {
  AvailabilitySlot,
  Holiday,
  ScheduleBlock,
} from "@/services/availability.service";

export const AVAILABILITY_QUERY_KEYS = {
  holidays: ["availability", "holidays"] as const,
  blocks: ["availability", "blocks"] as const,
};

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SLOT_REASON_LABELS: Record<
  NonNullable<AvailabilitySlot["reason"]>,
  string
> = {
  appointment: "ocupado",
  block: "bloqueado",
  holiday: "feriado",
};

export function dentroDaGrade(
  slots: AvailabilitySlot[],
  inicio: Date,
  duracaoMin: number,
): boolean | null {
  if (!slots.length) return null;
  const fim = inicio.getTime() + duracaoMin * 60_000;
  const faixas: [number, number][] = [];
  for (const s of [...slots].sort((a, b) => a.start.localeCompare(b.start))) {
    const ini = new Date(s.start).getTime();
    const end = new Date(s.end).getTime();
    const ultima = faixas[faixas.length - 1];
    if (ultima && ini <= ultima[1]) ultima[1] = Math.max(ultima[1], end);
    else faixas.push([ini, end]);
  }
  return faixas.some(([a, b]) => inicio.getTime() >= a && fim <= b);
}

export const NATIONAL_FIXED_HOLIDAYS: { md: string; name: string }[] = [
  { md: "01-01", name: "Confraternização Universal" },
  { md: "04-21", name: "Tiradentes" },
  { md: "05-01", name: "Dia do Trabalho" },
  { md: "09-07", name: "Independência do Brasil" },
  { md: "10-12", name: "Nossa Senhora Aparecida" },
  { md: "11-02", name: "Finados" },
  { md: "11-15", name: "Proclamação da República" },
  { md: "11-20", name: "Dia da Consciência Negra" },
  { md: "12-25", name: "Natal" },
];

export function holidayOn(
  holidays: Holiday[],
  date: string,
): Holiday | undefined {
  return holidays.find(
    (h) => h.date === date || (h.recurring && h.date.slice(5) === date.slice(5)),
  );
}

export function blockAppliesTo(b: ScheduleBlock, doctorIds: string[]): boolean {
  return !b.doctorId || doctorIds.length === 0 || doctorIds.includes(b.doctorId);
}

export function bloqueioAtinge(
  b: Pick<ScheduleBlock, "doctorId" | "clinicId">,
  doctorId: string,
  clinicId: string | null,
): boolean {
  if (b.doctorId && b.doctorId !== doctorId) return false;
  if (!b.clinicId) return true;
  if (clinicId) return b.clinicId === clinicId;
  return !!b.doctorId;
}

export function bloqueioNoHorario(
  bloqueios: ScheduleBlock[],
  doctorId: string,
  clinicId: string | null,
  inicio: Date,
  duracaoMin: number,
): ScheduleBlock | undefined {
  const ini = inicio.getTime();
  const fim = ini + duracaoMin * 60_000;
  return bloqueios.find(
    (b) =>
      bloqueioAtinge(b, doctorId, clinicId) &&
      new Date(b.startsAt).getTime() < fim &&
      ini < new Date(b.endsAt).getTime(),
  );
}

export function bloqueioNoDia(
  b: Pick<ScheduleBlock, "startsAt" | "endsAt">,
  dia: Date,
): boolean {
  const ini = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const fim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
  return (
    new Date(b.startsAt).getTime() < fim.getTime() &&
    ini.getTime() < new Date(b.endsAt).getTime()
  );
}
