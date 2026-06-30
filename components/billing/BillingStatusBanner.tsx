"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowUpRight, Clock, XCircle } from "lucide-react";

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
        "Acesse o Portal da Stripe para regularizar seu pagamento e reativar o acesso.",
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
        ? `Estamos tentando cobrar desde ${new Date(pastDueSince).toLocaleDateString("pt-BR")}. Acesse o Portal da Stripe para atualizar seu m\u00e9todo de pagamento.`
        : "Acesse o Portal da Stripe para atualizar seu m\u00e9todo de pagamento.",
      action: "Gerenciar assinatura",
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
          "Escolha um plano para continuar usando a plataforma sem interrup\u00e7\u00e3o.",
        action: "Ver planos",
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
    info: "border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50/60 text-blue-950",
    warning:
      "border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 text-amber-950",
    danger:
      "border-rose-200/90 bg-gradient-to-r from-rose-50 via-white to-red-50/70 text-rose-950",
  };
  const iconColor: Record<Variant["tone"], string> = {
    info: "text-blue-500",
    warning: "text-amber-500",
    danger: "text-rose-500",
  };
  const buttonColor: Record<Variant["tone"], string> = {
    info: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
    warning: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
    danger: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
  };

  return (
    <div className="bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:p-4 md:flex-row md:items-center md:justify-between",
          styles[variant.tone],
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5">
            <Icon className={cn("h-5 w-5 shrink-0", iconColor[variant.tone])} />
          </div>
          <div>
            <p className="text-sm font-semibold sm:text-[15px]">
              {variant.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed opacity-90 sm:text-sm">
              {variant.description}
            </p>
          </div>
        </div>
        <Link
          href="/configuracoes?tab=plan"
          className={cn(
            "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:min-h-[38px] md:w-auto",
            buttonColor[variant.tone],
          )}
        >
          {variant.action}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
