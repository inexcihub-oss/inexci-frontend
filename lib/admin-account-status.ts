import type { ApiSchema } from "@/types/api";

export type AdminAccountSituation =
  ApiSchema<"AdminAccountItemDto">["situation"];

export const ADMIN_ACCOUNT_SITUATIONS: AdminAccountSituation[] = [
  "trial",
  "trial_expired",
  "active",
  "cancel_scheduled",
  "past_due",
  "suspended",
  "canceled",
  "internal",
  "deactivated",
];

export const ADMIN_SITUATION_META: Record<
  AdminAccountSituation,
  { label: string; className: string }
> = {
  trial: { label: "Trial", className: "bg-[#FFF7D7] text-[#805F10]" },
  trial_expired: {
    label: "Trial vencido",
    className: "bg-red-50 text-red-700",
  },
  active: { label: "Ativa", className: "bg-emerald-50 text-emerald-700" },
  cancel_scheduled: {
    label: "Cancelamento agendado",
    className: "bg-amber-50 text-amber-700",
  },
  past_due: { label: "Inadimplente", className: "bg-red-50 text-red-700" },
  suspended: { label: "Suspensa", className: "bg-red-100 text-red-800" },
  canceled: { label: "Cancelada", className: "bg-gray-100 text-gray-600" },
  internal: {
    label: "Acesso interno",
    className: "bg-violet-50 text-violet-700",
  },
  deactivated: {
    label: "Desativada",
    className: "bg-gray-900 text-white",
  },
};

export interface SituationInput {
  situation: AdminAccountSituation;
  daysLeft: number | null;
  daysOverdue: number | null;
  currentPeriodEnd: string | null;
  accountDeactivatedAt?: string | null;
}

export function formatDayMonth(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function plural(n: number, singular: string, pluralWord: string): string {
  return n === 1 ? singular : pluralWord;
}

export function describeSituation(input: SituationInput): string | null {
  switch (input.situation) {
    case "trial": {
      const n = input.daysLeft ?? 0;
      return `${plural(n, "falta", "faltam")} ${n} ${plural(n, "dia", "dias")}`;
    }
    case "trial_expired": {
      const n = input.daysOverdue ?? 0;
      return `venceu há ${n} ${plural(n, "dia", "dias")}`;
    }
    case "active":
      return `próxima cobrança ${formatDayMonth(input.currentPeriodEnd)}`;
    case "cancel_scheduled":
      return `encerra em ${formatDayMonth(input.currentPeriodEnd)}`;
    case "past_due": {
      const n = input.daysLeft ?? 0;
      return `suspende em ${n} ${plural(n, "dia", "dias")}`;
    }
    case "deactivated":
      return input.accountDeactivatedAt
        ? `desde ${formatDayMonth(input.accountDeactivatedAt)}`
        : null;
    default:
      return null;
  }
}
