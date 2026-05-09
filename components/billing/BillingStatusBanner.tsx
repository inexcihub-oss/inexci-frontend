"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

/**
 * Banner global exibido no topo do dashboard quando a assinatura
 * exige aten\u00e7\u00e3o do admin (trial expirando, inadimpl\u00eancia, suspens\u00e3o,
 * cota saturada). Apenas admins veem este banner.
 */
export function BillingStatusBanner() {
  const { isAdmin, subscription } = useAuth();

  if (!isAdmin || !subscription) return null;

  const { status, cancelAtPeriodEnd, currentPeriodEnd, pastDueSince } =
    subscription.subscription;
  const { quota, daysLeftInTrial } = subscription;

  type Variant = {
    tone: "info" | "warning" | "danger";
    icon: React.ElementType;
    title: string;
    description: string;
    action: string;
  };

  let variant: Variant | null = null;

  if (status === "suspended") {
    variant = {
      tone: "danger",
      icon: XCircle,
      title: "Sua assinatura est\u00e1 suspensa",
      description:
        "Cadastre um m\u00e9todo de pagamento ou regularize sua fatura para liberar o acesso completo.",
      action: "Resolver agora",
    };
  } else if (status === "canceled") {
    variant = {
      tone: "danger",
      icon: XCircle,
      title: "Sua assinatura foi cancelada",
      description: "Contrate um plano para voltar a usar a plataforma.",
      action: "Ver planos",
    };
  } else if (status === "past_due") {
    variant = {
      tone: "danger",
      icon: AlertTriangle,
      title: "Pagamento da \u00faltima fatura falhou",
      description: pastDueSince
        ? `Estamos tentando cobrar desde ${new Date(pastDueSince).toLocaleDateString("pt-BR")}. Atualize seu cart\u00e3o para evitar a suspens\u00e3o.`
        : "Atualize seu cart\u00e3o para evitar a suspens\u00e3o da conta.",
      action: "Atualizar pagamento",
    };
  } else if (status === "trialing") {
    if (daysLeftInTrial != null && daysLeftInTrial <= 7) {
      variant = {
        tone: "warning",
        icon: Clock,
        title:
          daysLeftInTrial > 0
            ? `Seu free trial termina em ${daysLeftInTrial} dia(s)`
            : "Seu free trial termina hoje",
        description:
          "Cadastre um cart\u00e3o para continuar usando a plataforma sem interrup\u00e7\u00e3o.",
        action: "Cadastrar cart\u00e3o",
      };
    }
  } else if (cancelAtPeriodEnd) {
    variant = {
      tone: "warning",
      icon: Clock,
      title: "Cancelamento agendado",
      description: `Sua assinatura ser\u00e1 encerrada em ${new Date(currentPeriodEnd).toLocaleDateString("pt-BR")}.`,
      action: "Reativar",
    };
  } else if (
    status === "active" &&
    quota &&
    !quota.isUnlimited &&
    quota.remaining === 0
  ) {
    variant = {
      tone: "warning",
      icon: AlertTriangle,
      title: "Voc\u00ea atingiu o limite de solicita\u00e7\u00f5es do plano",
      description: `Use ${quota.used}/${quota.limit} solicita\u00e7\u00f5es deste ciclo. Fa\u00e7a upgrade para continuar criando.`,
      action: "Fazer upgrade",
    };
  } else if (
    status === "active" &&
    quota &&
    !quota.isUnlimited &&
    quota.limit > 0 &&
    quota.remaining / quota.limit <= 0.1
  ) {
    variant = {
      tone: "info",
      icon: AlertTriangle,
      title: "Cota mensal quase atingida",
      description: `Restam apenas ${quota.remaining} de ${quota.limit} solicita\u00e7\u00f5es neste ciclo.`,
      action: "Ver plano",
    };
  }

  if (!variant) return null;

  const Icon = variant.icon;
  const styles: Record<Variant["tone"], string> = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    danger: "bg-red-50 border-red-200 text-red-900",
  };
  const iconColor: Record<Variant["tone"], string> = {
    info: "text-blue-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };
  const buttonColor: Record<Variant["tone"], string> = {
    info: "bg-blue-600 hover:bg-blue-700",
    warning: "bg-amber-600 hover:bg-amber-700",
    danger: "bg-red-600 hover:bg-red-700",
  };

  return (
    <div className={cn("border-b px-4 py-3", styles[variant.tone])}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-start gap-3">
          <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", iconColor[variant.tone])} />
          <div>
            <p className="text-sm font-semibold">{variant.title}</p>
            <p className="text-xs opacity-90">{variant.description}</p>
          </div>
        </div>
        <Link
          href="/configuracoes?tab=plan"
          className={cn(
            "inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold text-white transition-colors min-h-[36px] whitespace-nowrap",
            buttonColor[variant.tone],
          )}
        >
          {variant.action}
        </Link>
      </div>
    </div>
  );
}
