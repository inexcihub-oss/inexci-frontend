import type {
  AvailabilitySlot,
  Holiday,
  ScheduleBlock,
} from "@/services/availability.service";

export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

/** Ordem de exibição: segunda primeiro, domingo por último. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const SLOT_REASON_LABELS: Record<
  NonNullable<AvailabilitySlot["reason"]>,
  string
> = {
  appointment: "ocupado",
  block: "bloqueado",
  holiday: "feriado",
};

/**
 * O intervalo `[inicio, inicio + duração)` cabe na grade do dia? A grade é a
 * união dos horários devolvidos pela API (livres ou não), já que a consulta
 * pode ocupar vários horários seguidos. Sem nenhum horário (profissional sem
 * grade no dia) a resposta é `null`: não há grade contra a qual comparar.
 */
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

/** Feriados nacionais de data fixa (os móveis o usuário cadastra por ano). */
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

/** Feriado que cai na data (`YYYY-MM-DD`), exato ou recorrente. */
export function holidayOn(
  holidays: Holiday[],
  date: string,
): Holiday | undefined {
  return holidays.find(
    (h) => h.date === date || (h.recurring && h.date.slice(5) === date.slice(5)),
  );
}

/** Bloqueio vale para o profissional (ou é da clínica toda). */
export function blockAppliesTo(b: ScheduleBlock, doctorIds: string[]): boolean {
  return !b.doctorId || doctorIds.length === 0 || doctorIds.includes(b.doctorId);
}
