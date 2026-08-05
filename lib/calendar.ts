import { Appointment, AppointmentStatus } from "@/services/appointment.service";
import { SurgeryRequestListItem } from "@/services/surgery-request.service";

// ─── Constantes PT ─────────────────────────────────────────────────────────────

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Helpers de data (horário local) ───────────────────────────────────────────

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Início da semana (domingo) do dia informado. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  return addDays(x, -x.getDay());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export function hhmm(d: Date): string {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// ─── Evento unificado ───────────────────────────────────────────────────────────

export type CalEventKind = "appointment" | "surgery";

export interface CalEvent {
  id: string;
  kind: CalEventKind;
  start: Date;
  end: Date;
  allDay: boolean;
  title: string;
  subtitle: string;
  doctorId?: string;
  status?: AppointmentStatus;
  appointment?: Appointment;
  surgery?: SurgeryRequestListItem & { surgeryDate: string };
}

const DEFAULT_SURGERY_MINUTES = 60;

export function appointmentToEvent(a: Appointment, typeLabel: string): CalEvent {
  const start = new Date(a.scheduledAt);
  return {
    id: `appt-${a.id}`,
    kind: "appointment",
    start,
    end: new Date(start.getTime() + a.durationMinutes * 60_000),
    allDay: false,
    title: a.patient?.name ?? "Consulta",
    subtitle: typeLabel,
    doctorId: a.doctorId,
    status: a.status,
    appointment: a,
  };
}

export function surgeryToEvent(
  s: SurgeryRequestListItem & { surgeryDate: string },
): CalEvent {
  const start = new Date(s.surgeryDate);
  const allDay = start.getHours() === 0 && start.getMinutes() === 0;
  return {
    id: `sr-${s.id}`,
    kind: "surgery",
    start,
    end: new Date(start.getTime() + DEFAULT_SURGERY_MINUTES * 60_000),
    allDay,
    title: s.patient?.name ?? "Cirurgia",
    subtitle:
      s.procedure?.name ??
      (s.tussProcedure?.description || s.procedureName) ??
      "Cirurgia",
    doctorId: s.doctor?.id,
    surgery: s,
  };
}

// ─── Cores por tipo/status ──────────────────────────────────────────────────────

export interface EventColors {
  bar: string; // barra lateral / ponto
  bg: string; // fundo do bloco
  text: string;
  border: string;
}

export function eventColors(ev: CalEvent): EventColors {
  if (ev.kind === "surgery") {
    return {
      bar: "bg-teal-500",
      bg: "bg-teal-50 hover:bg-teal-100",
      text: "text-teal-800",
      border: "border-teal-200",
    };
  }
  switch (ev.status) {
    case "confirmed":
      return {
        bar: "bg-indigo-500",
        bg: "bg-indigo-50 hover:bg-indigo-100",
        text: "text-indigo-800",
        border: "border-indigo-200",
      };
    case "completed":
      return {
        bar: "bg-green-500",
        bg: "bg-green-50 hover:bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
      };
    case "cancelled":
      return {
        bar: "bg-red-400",
        bg: "bg-red-50 hover:bg-red-100",
        text: "text-red-500 line-through",
        border: "border-red-200",
      };
    case "no_show":
      return {
        bar: "bg-amber-500",
        bg: "bg-amber-50 hover:bg-amber-100",
        text: "text-amber-800",
        border: "border-amber-200",
      };
    default:
      return {
        bar: "bg-blue-500",
        bg: "bg-blue-50 hover:bg-blue-100",
        text: "text-blue-800",
        border: "border-blue-200",
      };
  }
}

// ─── Layout de sobreposição (lanes tipo Google Calendar) ────────────────────────

export interface PositionedEvent {
  event: CalEvent;
  col: number;
  cols: number;
}

/** Agrupa eventos que se sobrepõem e atribui colunas para dividir a largura. */
export function layoutOverlaps(events: CalEvent[]): PositionedEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime(),
  );
  const result: PositionedEvent[] = [];
  let cluster: CalEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const colEnds: number[] = [];
    const assigned = new Map<string, number>();
    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < colEnds.length; i++) {
        if (colEnds[i] <= ev.start.getTime()) {
          colEnds[i] = ev.end.getTime();
          assigned.set(ev.id, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        assigned.set(ev.id, colEnds.length);
        colEnds.push(ev.end.getTime());
      }
    }
    const cols = colEnds.length;
    for (const ev of cluster) {
      result.push({ event: ev, col: assigned.get(ev.id)!, cols });
    }
  };

  for (const ev of sorted) {
    if (cluster.length && ev.start.getTime() >= clusterEnd) {
      flush();
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end.getTime());
  }
  if (cluster.length) flush();

  return result;
}
