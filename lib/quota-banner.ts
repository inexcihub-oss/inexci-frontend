import { formatDateBR } from "@/lib/formatters";
import type { QuotaStatus } from "@/types";

/**
 * Degraus de consumo da cota de solicitações cirúrgicas.
 *
 * O corte é sobre `used / limit` puro, sem arredondar para cima: num plano de
 * 10, o aviso de 75% nasce na 8ª solicitação (80%), não na 7,5ª — que não
 * existe. O usuário lê números inteiros, então o gatilho tem que cair num
 * número inteiro.
 */
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
  /** 0–100, já clampado — alimenta a barra de progresso. */
  progressPercent: number;
  /** "17/20" — rótulo textual ao lado da barra. */
  usageLabel: string;
  /** Só o dono da conta contrata plano; os demais veem texto sem link. */
  showUpgradeCta: boolean;
  /**
   * `critical` não é dispensável: nesse ponto o envio está de fato bloqueado,
   * e um banner que some esconderia a explicação do bloqueio.
   */
  dismissible: boolean;
}

export interface ResolveQuotaBannerInput {
  quota: QuotaStatus | null | undefined;
  isAccountOwner: boolean;
  /** Degraus que o usuário já fechou neste ciclo. */
  dismissedThresholds?: QuotaThreshold[];
}

/**
 * Decide qual aviso de cota mostrar — ou nenhum.
 *
 * Função pura de propósito: toda a regra de degrau, cópia e dispensa fica
 * testável sem montar React.
 */
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
  // Plano sem solicitações contratadas: qualquer uso já é o teto, e dividir
  // por zero devolveria Infinity/NaN.
  if (quota.limit <= 0) return "critical";

  const ratio = quota.used / quota.limit;
  if (ratio >= QUOTA_THRESHOLD_RATIOS.critical) return "critical";
  if (ratio >= QUOTA_THRESHOLD_RATIOS.high) return "high";
  if (ratio >= QUOTA_THRESHOLD_RATIOS.medium) return "medium";
  return null;
}

/**
 * `remaining` vem pronto do backend, mas cai para o cálculo local se vier nulo
 * — o campo é `null` para plano ilimitado, e ilimitado já saiu antes daqui.
 */
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

/**
 * Chave de dispensa por degrau **e** por ciclo: quando o ciclo vira,
 * `periodEnd` muda, a chave muda e o aviso volta sozinho — sem tabela nova e
 * sem request de leitura.
 */
export function quotaDismissKey(
  accountId: string,
  periodEnd: string,
  threshold: QuotaThreshold,
): string {
  return `inexci:quota-dismissed:${accountId}:${periodEnd}:${threshold}`;
}
