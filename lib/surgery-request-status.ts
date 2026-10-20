import type { SurgeryRequestStatus } from "@/types/surgery-request.types";

export enum SurgeryRequestStatusCode {
  PENDING = 1,
  SENT = 2,
  IN_ANALYSIS = 3,
  IN_SCHEDULING = 4,
  SCHEDULED = 5,
  PERFORMED = 6,
  INVOICED = 7,
  FINALIZED = 8,
  CLOSED = 9,
}

const S = SurgeryRequestStatusCode;

export interface StatusMeta {
  label: SurgeryRequestStatus;
  badge: { bg: string; text: string; border: string };
  icon: string;
  chartColor: string;
  order: number;
}

export const STATUS_META: Record<SurgeryRequestStatusCode, StatusMeta> = {
  [S.PENDING]: {
    label: "Pendente",
    badge: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    icon: "/icons/kanban/clock-watch.svg",
    chartColor: "#f59e0b",
    order: 1,
  },
  [S.SENT]: {
    label: "Enviada",
    badge: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    icon: "/icons/kanban/email-send-fast-circle.svg",
    chartColor: "#3b82f6",
    order: 2,
  },
  [S.IN_ANALYSIS]: {
    label: "Em Análise",
    badge: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
    },
    icon: "/icons/kanban/loading-waiting.svg",
    chartColor: "#eab308",
    order: 3,
  },
  [S.IN_SCHEDULING]: {
    label: "Em Agendamento",
    badge: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
    },
    icon: "/icons/kanban/calendar-chedule-clock.svg",
    chartColor: "#f97316",
    order: 4,
  },
  [S.SCHEDULED]: {
    label: "Agendada",
    badge: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    icon: "/icons/kanban/calendar-schedule-checkmark.svg",
    chartColor: "#14b8a6",
    order: 5,
  },
  [S.PERFORMED]: {
    label: "Realizada",
    badge: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    icon: "/icons/kanban/hospital-board-square.svg",
    chartColor: "#10b981",
    order: 6,
  },
  [S.INVOICED]: {
    label: "Faturada",
    badge: {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      border: "border-indigo-200",
    },
    icon: "/icons/kanban/coins.svg",
    chartColor: "#6366f1",
    order: 7,
  },
  [S.FINALIZED]: {
    label: "Finalizada",
    badge: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
    },
    icon: "/icons/kanban/checkmark-circle-1.svg",
    chartColor: "#059669",
    order: 8,
  },
  [S.CLOSED]: {
    label: "Encerrada",
    badge: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    icon: "/icons/kanban/Delete, Disabled.svg",
    chartColor: "#6b7280",
    order: 9,
  },
};

export const ALL_STATUS_CODES: readonly SurgeryRequestStatusCode[] = (
  Object.keys(STATUS_META).map(Number) as SurgeryRequestStatusCode[]
).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);

export const ALL_STATUS_LABELS: readonly SurgeryRequestStatus[] =
  ALL_STATUS_CODES.map((code) => STATUS_META[code].label);

export function isStatusCode(value: unknown): value is SurgeryRequestStatusCode {
  return typeof value === "number" && value in STATUS_META;
}

export function getStatusMeta(status: number): StatusMeta | undefined {
  return isStatusCode(status) ? STATUS_META[status] : undefined;
}

export function getStatusLabel(status: number): SurgeryRequestStatus | undefined {
  return getStatusMeta(status)?.label;
}

const LABEL_TO_CODE = new Map<string, SurgeryRequestStatusCode>(
  ALL_STATUS_CODES.map((code) => [STATUS_META[code].label, code]),
);

export function statusCodeFromLabel(
  label: string,
): SurgeryRequestStatusCode | undefined {
  return LABEL_TO_CODE.get(label);
}

const LABEL_META = new Map<string, StatusMeta>(
  ALL_STATUS_CODES.map((code) => [STATUS_META[code].label, STATUS_META[code]]),
);

export function getStatusMetaByLabel(label: string): StatusMeta | undefined {
  return LABEL_META.get(label);
}

export const FLOW_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.PENDING,
  S.SENT,
  S.IN_ANALYSIS,
  S.IN_SCHEDULING,
  S.SCHEDULED,
  S.PERFORMED,
  S.INVOICED,
  S.FINALIZED,
];

export const POST_PERFORMED_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.PERFORMED,
  S.INVOICED,
  S.FINALIZED,
];

export const INVOICED_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.INVOICED,
  S.FINALIZED,
];

export const PRE_SCHEDULED_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.PENDING,
  S.SENT,
  S.IN_ANALYSIS,
  S.IN_SCHEDULING,
];

export const AUTHORIZED_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.IN_SCHEDULING,
  S.SCHEDULED,
  S.PERFORMED,
  S.INVOICED,
  S.FINALIZED,
];

export const SCHEDULING_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.IN_SCHEDULING,
  S.SCHEDULED,
];

export const EXPORTABLE_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.SENT,
  S.IN_ANALYSIS,
  S.IN_SCHEDULING,
  S.SCHEDULED,
  S.PERFORMED,
  S.INVOICED,
  S.FINALIZED,
];

export const TUSS_OPME_EDITABLE_STATUSES: readonly SurgeryRequestStatusCode[] =
  [S.PENDING, S.SENT];

export const STALE_EXEMPT_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.PERFORMED,
  S.INVOICED,
  S.FINALIZED,
  S.CLOSED,
];

export const TERMINAL_STATUSES: readonly SurgeryRequestStatusCode[] = [
  S.FINALIZED,
  S.CLOSED,
];

export function isStatusIn(
  status: number,
  set: readonly SurgeryRequestStatusCode[],
): boolean {
  return (set as readonly number[]).includes(status);
}

export interface StatusEvidence {
  status: number;
  analysis?: unknown;
  surgeryDate?: string | null;
  surgeryPerformedAt?: string | null;
  billing?: { invoiceValue?: number | null; invoiceSentAt?: string | null } | null;
  scheduling?: { dateOptions?: string[] } | null;
  dateOptions?: string[];
}

export function reachedStatus(
  sr: StatusEvidence,
  target: SurgeryRequestStatusCode,
): boolean {
  if (sr.status !== S.CLOSED) {
    const current = FLOW_STATUSES.indexOf(sr.status as SurgeryRequestStatusCode);
    const wanted = FLOW_STATUSES.indexOf(target);
    if (current < 0 || wanted < 0) return false;
    return current >= wanted;
  }

  const hasDateOptions =
    (sr.scheduling?.dateOptions?.length ?? 0) > 0 ||
    (sr.dateOptions?.length ?? 0) > 0;
  const hasInvoice =
    sr.billing?.invoiceValue != null || Boolean(sr.billing?.invoiceSentAt);

  switch (target) {
    case S.PENDING:
    case S.CLOSED:
      return true;
    case S.SENT:
    case S.IN_ANALYSIS:
      return sr.analysis != null || hasDateOptions || Boolean(sr.surgeryDate);
    case S.IN_SCHEDULING:
      return hasDateOptions || Boolean(sr.surgeryDate);
    case S.SCHEDULED:
      return Boolean(sr.surgeryDate) || Boolean(sr.surgeryPerformedAt);
    case S.PERFORMED:
      return Boolean(sr.surgeryPerformedAt) || hasInvoice;
    case S.INVOICED:
      return hasInvoice;
    case S.FINALIZED:
      return false;
  }
}
