import { formatDateBR } from "@/lib/formatters";
import type { QuotaStatus } from "@/types";

export type QuotaThreshold = "medium" | "high" | "critical";

export type BannerTone = "info" | "warning" | "danger";

export const QUOTA_THRESHOLD_RATIOS: Record<QuotaThreshold, number> = {
  medium: 0.75,
  high: 0.9,
  critical: 1,
};

export interface QuotaBannerVariant {
  threshold: QuotaThreshold;
  tone: BannerTone;
  title: string;
  description: string;
  progressPercent: number;
  usageLabel: string;
  showUpgradeCta: boolean;
  dismissible: boolean;
}

export interface ResolveQuotaBannerInput {
  quota: QuotaStatus | null | undefined;
  isAccountOwner: boolean;
  dismissedThresholds?: QuotaThreshold[];
}

export function resolveQuotaBanner({
  quota,
  isAccountOwner,
  dismissedThresholds = [],
}: ResolveQuotaBannerInput): QuotaBannerVariant | null {
  if (!quota || quota.isUnlimited) return null;

  const threshold = resolveThreshold(quota);
  if (!threshold) return null;

  const dismissible = threshold !== "critical";
  if (dismissible && dismissedThresholds.includes(threshold)) return null;

  const remaining = resolveRemaining(quota);
  const renovaEm = formatDateBR(quota.periodEnd);

  return {
    threshold,
    tone: TONE_BY_THRESHOLD[threshold],
    title:
      threshold === "critical"
        ? `Você atingiu o limite de ${quota.limit} solicitações do plano`
        : `${remaining === 1 ? "Falta" : "Faltam"} ${remaining} de ${quota.limit} solicitações neste ciclo`,
    description: buildDescription({ threshold, isAccountOwner, renovaEm }),
    progressPercent: resolveProgressPercent(quota),
    usageLabel: `${quota.used}/${quota.limit}`,
    showUpgradeCta: isAccountOwner,
    dismissible,
  };
}

const TONE_BY_THRESHOLD: Record<QuotaThreshold, BannerTone> = {
  medium: "info",
  high: "warning",
  critical: "danger",
};

function resolveThreshold(quota: QuotaStatus): QuotaThreshold | null {
  if (quota.limit <= 0) return "critical";

  const ratio = quota.used / quota.limit;
  if (ratio >= QUOTA_THRESHOLD_RATIOS.critical) return "critical";
  if (ratio >= QUOTA_THRESHOLD_RATIOS.high) return "high";
  if (ratio >= QUOTA_THRESHOLD_RATIOS.medium) return "medium";
  return null;
}

function resolveRemaining(quota: QuotaStatus): number {
  return quota.remaining ?? Math.max(0, quota.limit - quota.used);
}

function resolveProgressPercent(quota: QuotaStatus): number {
  if (quota.limit <= 0) return 100;
  return Math.min(100, Math.max(0, (quota.used / quota.limit) * 100));
}

function buildDescription({
  threshold,
  isAccountOwner,
  renovaEm,
}: {
  threshold: QuotaThreshold;
  isAccountOwner: boolean;
  renovaEm: string;
}): string {
  if (!isAccountOwner) {
    return `Fale com o administrador da conta para ampliar o limite. Sua cota renova em ${renovaEm}.`;
  }
  if (threshold === "critical") {
    return `Faça upgrade do plano para voltar a enviar solicitações. Sua cota renova em ${renovaEm}.`;
  }
  return `Sua cota renova em ${renovaEm}.`;
}

export function quotaDismissKey(
  accountId: string,
  periodEnd: string,
  threshold: QuotaThreshold,
): string {
  return `inexci:quota-dismissed:${accountId}:${periodEnd}:${threshold}`;
}
