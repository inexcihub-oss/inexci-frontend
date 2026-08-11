import { formatDateBR } from "@/lib/formatters";
import type { BannerTone } from "@/lib/quota-banner";
import type { SubscriptionDetail } from "@/types";

export type BillingBannerIcon = "clock" | "alert" | "x";

export interface BillingBannerVariant {
  tone: BannerTone;
  icon: BillingBannerIcon;
  title: string;
  description: string;
  action: string;
}

/**
 * Decide o aviso de **estado da assinatura** (suspensa, cancelada, pagamento
 * em atraso, trial acabando, cancelamento agendado).
 *
 * Consumo de cota não entra aqui — é do `resolveQuotaBanner`. Os dois nunca
 * aparecem juntos: `GlobalBanners` dá precedência a este, porque uma
 * assinatura com problema de pagamento torna a conversa sobre cota irrelevante.
 *
 * Função pura, sem React, para que a escadinha de precedência seja testável
 * isoladamente.
 */
export function resolveBillingBanner(
  subscription: SubscriptionDetail | null | undefined,
): BillingBannerVariant | null {
  if (!subscription) return null;

  const { status, cancelAtPeriodEnd, currentPeriodEnd, pastDueSince } =
    subscription.subscription;
  const { daysLeftInTrial } = subscription;

  if (status === "suspended") {
    return {
      tone: "danger",
      icon: "x",
      title: "Sua assinatura está suspensa",
      description:
        "Acesse o Portal da Stripe para regularizar seu pagamento e reativar o acesso.",
      action: "Resolver agora",
    };
  }

  if (status === "canceled") {
    return {
      tone: "danger",
      icon: "x",
      title: "Sua assinatura foi cancelada",
      description: "Contrate um plano para voltar a usar a plataforma.",
      action: "Ver planos",
    };
  }

  if (status === "past_due") {
    return {
      tone: "danger",
      icon: "alert",
      title: "Pagamento da última fatura falhou",
      description: pastDueSince
        ? `Estamos tentando cobrar desde ${formatDateBR(pastDueSince)}. Acesse o Portal da Stripe para atualizar seu método de pagamento.`
        : "Acesse o Portal da Stripe para atualizar seu método de pagamento.",
      action: "Gerenciar assinatura",
    };
  }

  if (status === "trialing") {
    if (daysLeftInTrial == null || daysLeftInTrial > 7) return null;
    return {
      tone: "warning",
      icon: "clock",
      title:
        daysLeftInTrial > 0
          ? `Seu free trial termina em ${daysLeftInTrial} dia(s)`
          : "Seu free trial termina hoje",
      description:
        "Escolha um plano para continuar usando a plataforma sem interrupção.",
      action: "Ver planos",
    };
  }

  if (cancelAtPeriodEnd) {
    return {
      tone: "warning",
      icon: "clock",
      title: "Cancelamento agendado",
      description: `Sua assinatura será encerrada em ${formatDateBR(currentPeriodEnd)}.`,
      action: "Reativar",
    };
  }

  return null;
}
