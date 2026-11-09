import type {
  AdminErrorDay,
  AdminErrorPeriodDays,
  AdminErrorSource,
} from "@/services/admin.service";

export const ERROR_SOURCE_LABEL: Record<AdminErrorSource, string> = {
  http: "Requisição",
  queue: "Tarefa em fila",
  ai: "Assistente de IA",
  notification: "Envio",
  stripe_webhook: "Webhook da Stripe",
};

export const ERROR_SOURCE_CLASS: Record<AdminErrorSource, string> = {
  http: "bg-red-50 text-red-700",
  queue: "bg-amber-50 text-amber-700",
  ai: "bg-violet-50 text-violet-700",
  notification: "bg-blue-50 text-blue-700",
  stripe_webhook: "bg-gray-100 text-gray-700",
};

export const ERROR_PERIODS: Array<{
  days: AdminErrorPeriodDays;
  label: string;
}> = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

export const ERROR_SOURCE_OPTIONS: AdminErrorSource[] = ["http", "queue", "ai"];

export function parseErrorDays(value: string | null): AdminErrorPeriodDays {
  const n = Number(value);
  return ERROR_PERIODS.some((p) => p.days === n)
    ? (n as AdminErrorPeriodDays)
    : 30;
}

export function parseErrorSource(
  value: string | null,
): AdminErrorSource | undefined {
  return value && value in ERROR_SOURCE_LABEL
    ? (value as AdminErrorSource)
    : undefined;
}

function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function dayLabel(day: string): string {
  const [, month, d] = day.split("-");
  return `${d}/${month}`;
}

export interface ErrorBucket {
  key: string;
  label: string;
  total: number;
}

export function bucketErrorDays<T extends Pick<AdminErrorDay, "day" | "total">>(
  daily: T[],
  fromDay: string,
  toDay: string,
): ErrorBucket[] {
  const byDay = new Map<string, number>();
  for (const row of daily) {
    byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.total);
  }
  const days: string[] = [];
  for (let d = fromDay; d <= toDay; d = shiftDay(d, 1)) days.push(d);
  const size = days.length > 31 ? 7 : 1;
  const buckets: ErrorBucket[] = [];
  for (let i = 0; i < days.length; i += size) {
    const slice = days.slice(i, i + size);
    buckets.push({
      key: slice[0],
      label: dayLabel(slice[0]),
      total: slice.reduce((sum, d) => sum + (byDay.get(d) ?? 0), 0),
    });
  }
  return buckets;
}
