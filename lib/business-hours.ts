/**
 * Grade de funcionamento da clínica e a regra que decide se um horário de
 * consulta cai dentro dela. Espelha `src/shared/business-hours` do backend,
 * mas a decisão vive aqui: o backend não bloqueia agendamento fora do
 * expediente, porque o usuário pode confirmar mesmo assim.
 */

export const WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: "domingo",
  mon: "segunda-feira",
  tue: "terça-feira",
  wed: "quarta-feira",
  thu: "quinta-feira",
  fri: "sexta-feira",
  sat: "sábado",
};

export interface TimeBlock {
  start: string;
  end: string;
}

export type BusinessHours = Record<WeekdayKey, TimeBlock[]>;

export type ClosedReason =
  | "closed_day"
  | "outside_hours"
  | "overflows_closing";

export interface BusinessHoursCheck {
  open: boolean;
  reason?: ClosedReason;
}

export const MAX_BLOCKS_PER_DAY = 4;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function emptyBusinessHours(): BusinessHours {
  return WEEKDAY_KEYS.reduce((grade, dia) => {
    grade[dia] = [];
    return grade;
  }, {} as BusinessHours);
}

export function toMinutes(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Minutos desde a meia-noite → "HH:mm" (passa de 24h quando transborda o dia). */
export function fromMinutes(total: number): string {
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

/**
 * Completa os dias ausentes. Toda leitura passa por aqui — clínica gravada
 * sem grade chega como `{}` e quebraria o acesso direto por dia.
 */
export function normalizeBusinessHours(
  raw?: Partial<BusinessHours> | null,
): BusinessHours {
  const grade = emptyBusinessHours();
  if (!raw || typeof raw !== "object") return grade;

  for (const dia of WEEKDAY_KEYS) {
    const blocos = raw[dia];
    if (!Array.isArray(blocos)) continue;
    grade[dia] = blocos
      .filter(
        (b): b is TimeBlock =>
          !!b && typeof b.start === "string" && typeof b.end === "string",
      )
      .map((b) => ({ start: b.start, end: b.end }))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  }

  return grade;
}

export function weekdayKeyOf(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[date.getDay()];
}

/**
 * A consulta cabe no funcionamento da unidade?
 *
 * `overflows_closing` é o caso que passa despercebido: começa dentro do
 * expediente e termina depois do fechamento. Checar só o início deixaria
 * passar uma consulta de 1h marcada às 11:45 numa clínica que fecha ao meio-dia.
 */
export function isWithinBusinessHours(
  hours: BusinessHours,
  start: Date,
  durationMinutes: number,
): BusinessHoursCheck {
  const blocos = normalizeBusinessHours(hours)[weekdayKeyOf(start)];
  if (blocos.length === 0) return { open: false, reason: "closed_day" };

  const inicio = start.getHours() * 60 + start.getMinutes();
  const fim = inicio + durationMinutes;

  const bloco = blocos.find(
    (b) => inicio >= toMinutes(b.start) && inicio < toMinutes(b.end),
  );
  if (!bloco) return { open: false, reason: "outside_hours" };
  if (fim > toMinutes(bloco.end)) {
    return { open: false, reason: "overflows_closing" };
  }

  return { open: true };
}

/** Grade do dia em texto: "08:00–12:00, 14:00–18:00". */
export function descreveDia(hours: BusinessHours, date: Date): string {
  const blocos = normalizeBusinessHours(hours)[weekdayKeyOf(date)];
  if (blocos.length === 0) return "fechado";
  return blocos.map((b) => `${b.start}–${b.end}`).join(", ");
}

/**
 * Mensagem do aviso, ou `null` quando o horário está dentro do funcionamento.
 */
export function mensagemForaDoHorario(
  nomeClinica: string,
  hours: BusinessHours,
  start: Date,
  durationMinutes: number,
): string | null {
  const resultado = isWithinBusinessHours(hours, start, durationMinutes);
  if (resultado.open) return null;

  const dia = WEEKDAY_LABELS[weekdayKeyOf(start)];
  const inicio = start.getHours() * 60 + start.getMinutes();

  if (resultado.reason === "closed_day") {
    return `A clínica ${nomeClinica} não atende ${dia}.`;
  }

  if (resultado.reason === "outside_hours") {
    return `A clínica ${nomeClinica} não atende ${dia} às ${fromMinutes(
      inicio,
    )}. Funcionamento: ${descreveDia(hours, start)}.`;
  }

  const blocos = normalizeBusinessHours(hours)[weekdayKeyOf(start)];
  const bloco = blocos.find(
    (b) => inicio >= toMinutes(b.start) && inicio < toMinutes(b.end),
  );
  return `A consulta terminaria às ${fromMinutes(
    inicio + durationMinutes,
  )}, depois do fechamento da clínica ${nomeClinica} (${bloco?.end ?? ""}).`;
}
