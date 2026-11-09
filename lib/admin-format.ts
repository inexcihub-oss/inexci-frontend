import {
  ADMIN_SITUATION_META,
  describeSituation,
  type SituationInput,
} from "@/lib/admin-account-status";

export function formatUsdCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
  })
    .format(cents / 100)
    .replace("USD", "US$");
}

export function formatBrlCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatQuota(quota: { used: number; limit: number }): string {
  return `${quota.used} / ${quota.limit < 0 ? "∞" : quota.limit}`;
}

const DAY_MS = 86_400_000;

function spDay(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
  return Date.parse(`${parts}T00:00:00Z`);
}

export function formatRelative(iso: string | null, now = new Date()): string {
  if (!iso) return "nunca";
  const days = Math.round((spDay(now) - spDay(new Date(iso))) / DAY_MS);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}

export interface CsvAccountRow extends SituationInput {
  name: string;
  email: string;
  plan: { name: string };
  monthlyAmountCents: number;
  doctors: number;
  collaborators: number;
  surgeryRequestsThisMonth: number;
  quota: { used: number; limit: number };
  aiCostThisMonthUsdCents: number;
  lastSeenAt: string | null;
}

export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildAccountsCsv(
  rows: CsvAccountRow[],
  now = new Date(),
): string {
  const header = [
    "Conta",
    "E-mail",
    "Plano",
    "Situação",
    "Mensalidade",
    "Médicos",
    "Colaboradores",
    "SCs no mês",
    "IA no mês",
    "Último acesso",
  ].join(",");
  const lines = rows.map((r) => {
    const aux = describeSituation(r);
    const situacao = aux
      ? `${ADMIN_SITUATION_META[r.situation].label} - ${aux}`
      : ADMIN_SITUATION_META[r.situation].label;
    return [
      r.name,
      r.email,
      r.plan.name,
      situacao,
      r.monthlyAmountCents > 0 ? formatBrlCents(r.monthlyAmountCents) : "",
      String(r.doctors),
      String(r.collaborators),
      formatQuota({ used: r.surgeryRequestsThisMonth, limit: r.quota.limit }),
      formatUsdCents(r.aiCostThisMonthUsdCents),
      formatRelative(r.lastSeenAt, now),
    ]
      .map((cell) => csvCell(cell.replace(/\u00a0/g, " ")))
      .join(",");
  });
  return [header, ...lines].join("\n");
}

export function formatSpDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

const MONTHS_PT = [
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

export function formatMonthLabel(month: string): string {
  const [year, m] = month.split("-");
  return `${MONTHS_PT[Number(m) - 1] ?? m}/${year}`;
}

export function pluralize(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
