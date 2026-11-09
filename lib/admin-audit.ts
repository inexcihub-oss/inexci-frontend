import type { PlatformAuditAction } from "@/services/admin.service";

export const AUDIT_ACTION_LABEL: Record<PlatformAuditAction, string> = {
  TRIAL_EXTENDED: "Trial estendido",
  INTERNAL_ACCESS_GRANTED: "Acesso interno liberado",
  INTERNAL_ACCESS_REVOKED: "Acesso interno encerrado",
  COUPON_CREATED: "Cupom criado",
  COUPON_DEACTIVATED: "Cupom desativado",
  PLATFORM_ADMIN_CREATED: "Administrador criado",
  PLATFORM_ADMIN_REVOKED: "Acesso de administrador revogado",
  PLATFORM_ADMIN_ACCESS_RESET: "Acesso de administrador redefinido",
  CRON_STALE_REQUESTS_TRIGGERED:
    "Verificação de solicitações paradas executada",
  CRON_WEEKLY_SUMMARY_TRIGGERED: "Resumo semanal enviado manualmente",
  ACCOUNT_DEACTIVATED: "Conta desativada",
  ACCOUNT_REACTIVATED: "Conta reativada",
  QUEUE_JOB_RETRIED: "Tarefa da fila executada de novo",
  QUEUE_JOB_DISCARDED: "Tarefa da fila descartada",
  STRIPE_EVENT_REPROCESSED: "Evento da Stripe reprocessado",
  CLINICAL_ACCESS_EXPORTED: "Volume de acessos a prontuário exportado",
  CLINICAL_ACCESS_PATIENT_VIEWED:
    "Acessos ao prontuário de um paciente consultados",
};

export const AUDIT_ACTIONS = Object.keys(
  AUDIT_ACTION_LABEL,
) as PlatformAuditAction[];

export const AUDIT_STATUS_LABEL = {
  pending: "Pendente",
  succeeded: "Concluída",
  failed: "Falhou",
} as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function formatDateTimeSP(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") {
    return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))
      ? formatDateTimeSP(value)
      : value;
  }
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export function auditEntries(
  data: Record<string, unknown> | null,
): Array<[string, string]> {
  if (!data) return [];
  return Object.entries(data).map(([key, value]) => [
    key,
    formatAuditValue(value),
  ]);
}

export function startOfDaySP(date: string): string {
  return `${date}T00:00:00-03:00`;
}

export function endOfDaySP(date: string): string {
  return `${date}T23:59:59.999-03:00`;
}
