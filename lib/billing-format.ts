import type { BillingPeriod, SubscriptionStatus } from "@/types";

export function formatPriceCents(
  amountCents: number,
  currency: string = "BRL",
): string {
  return (amountCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

export function billingPeriodLabel(period: BillingPeriod): string {
  return period === "MONTHLY" ? "/mês" : "/ano";
}

export function quotaLabel(quota: number): string {
  if (quota === -1) return "Solicitações ilimitadas";
  return `${quota} solicitação${quota === 1 ? "" : "ões"} por mês`;
}

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Free Trial",
  active: "Ativa",
  past_due: "Pagamento pendente",
  suspended: "Suspensa",
  canceled: "Cancelada",
};

export const SUBSCRIPTION_STATUS_TONE: Record<
  SubscriptionStatus,
  "info" | "success" | "warning" | "danger" | "neutral"
> = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  suspended: "danger",
  canceled: "neutral",
};

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}
