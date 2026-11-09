import { csvCell } from "@/lib/admin-format";
import type {
  AdminClinicalAccessDays,
  AdminClinicalAccessUser,
  AdminSecurityEventType,
  AdminSecurityPeriodDays,
  AdminSecurityTotals,
} from "@/services/admin.service";

export const SECURITY_EVENT_LABEL: Record<AdminSecurityEventType, string> = {
  login_failed: "Senha errada",
  login_locked: "Login bloqueado",
  mfa_failed: "Código de duas etapas errado",
  refresh_reuse: "Reuso de sessão",
  password_changed: "Senha trocada",
  mfa_enabled: "Duas etapas ligada",
  mfa_disabled: "Duas etapas desligada",
};

export const SECURITY_EVENT_CLASS: Record<AdminSecurityEventType, string> = {
  login_failed: "bg-amber-50 text-amber-700",
  login_locked: "bg-red-50 text-red-700",
  mfa_failed: "bg-amber-50 text-amber-700",
  refresh_reuse: "bg-red-50 text-red-700",
  password_changed: "bg-blue-50 text-blue-700",
  mfa_enabled: "bg-emerald-50 text-emerald-700",
  mfa_disabled: "bg-gray-100 text-gray-700",
};

export const SECURITY_EVENT_ORDER: AdminSecurityEventType[] = [
  "login_failed",
  "login_locked",
  "mfa_failed",
  "refresh_reuse",
  "password_changed",
  "mfa_enabled",
  "mfa_disabled",
];

export const FAILURE_EVENT_TYPES: AdminSecurityEventType[] = [
  "login_failed",
  "login_locked",
  "mfa_failed",
];

export const SECURITY_PERIODS: Array<{
  days: AdminSecurityPeriodDays;
  label: string;
}> = [
  { days: 1, label: "Hoje" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

export function parseSecurityDays(
  value: string | null,
): AdminSecurityPeriodDays {
  const n = Number(value);
  return SECURITY_PERIODS.some((p) => p.days === n)
    ? (n as AdminSecurityPeriodDays)
    : 30;
}

export function sumSecurityEvents(
  totals: AdminSecurityTotals,
  types: AdminSecurityEventType[],
): number {
  return types.reduce((sum, type) => sum + (totals[type] ?? 0), 0);
}

export const CLINICAL_PERIODS: Array<{
  days: AdminClinicalAccessDays;
  label: string;
}> = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

const CLINICAL_RESOURCE_LABEL: Record<string, string> = {
  clinical_record: "Ficha de atendimento",
  patient: "Cadastro do paciente",
  surgery_request: "Solicitação cirúrgica",
};

const CLINICAL_ACTION_LABEL: Record<string, string> = {
  read: "Leitura",
  list: "Listagem",
  create: "Criação",
  created: "Criação",
  update: "Edição",
  delete: "Exclusão",
  finalize: "Finalização",
};

const CLINICAL_ORIGIN_LABEL: Record<string, string> = {
  http: "Plataforma",
  ai: "Assistente de IA",
  system: "Sistema",
};

const PATIENT_LOOKUP_PATTERN =
  /^([0-9a-f]{10}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function normalizePatientLookup(value: string): string | null {
  const trimmed = value.trim().replace(/^#/, "");
  return PATIENT_LOOKUP_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function formatPatientRef(ref: string): string {
  return `#${ref.toUpperCase()}`;
}

export function clinicalResourceLabel(resource: string): string {
  return CLINICAL_RESOURCE_LABEL[resource] ?? resource;
}

export function clinicalActionLabel(action: string): string {
  return CLINICAL_ACTION_LABEL[action] ?? action.replace(/_/g, " ");
}

export function clinicalOriginLabel(origin: string): string {
  return CLINICAL_ORIGIN_LABEL[origin] ?? origin;
}

function formatCsvDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function buildClinicalAccessCsv(
  items: AdminClinicalAccessUser[],
): string {
  const header = [
    "Usuário",
    "Recurso",
    "Ação",
    "Acessos",
    "Último acesso",
  ].join(",");
  const lines = items.map((item) =>
    [
      item.userName ?? "Usuário removido",
      clinicalResourceLabel(item.resource),
      clinicalActionLabel(item.action),
      String(item.total),
      formatCsvDateTime(item.lastAccessAt),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
