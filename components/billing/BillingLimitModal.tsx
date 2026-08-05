"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CreditCard, XCircle } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { BillingBlockError, BillingBlockReason } from "@/lib/http-error";

const PLAN_TAB_HREF = "/configuracoes?tab=plan";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Bloqueio devolvido pelo backend (HTTP 402) ou derivado da assinatura. */
  block: BillingBlockError;
}

type Tone = "warning" | "danger";

interface Copy {
  tone: Tone;
  icon: React.ElementType;
  title: string;
  /** Texto para quem pode resolver — o dono da conta. */
  ownerDescription: string;
  /** Rótulo do CTA que leva à tela de planos. */
  ownerAction: string;
  /** Texto para quem não gerencia a assinatura. */
  memberDescription: string;
}

const COPY: Record<Exclude<BillingBlockReason, "unknown">, Copy> = {
  quota_exceeded: {
    tone: "warning",
    icon: AlertTriangle,
    title: "Limite de solicitações atingido",
    ownerDescription:
      "Você já usou todas as solicitações do seu plano neste ciclo. Faça upgrade para voltar a enviar solicitações agora mesmo.",
    ownerAction: "Ver planos e fazer upgrade",
    memberDescription:
      "O limite de solicitações do plano desta conta foi atingido neste ciclo. Peça ao administrador da conta para fazer o upgrade do plano.",
  },
  subscription_suspended: {
    tone: "danger",
    icon: XCircle,
    title: "Assinatura suspensa",
    ownerDescription:
      "Sua assinatura está suspensa por pendência de pagamento. Regularize a fatura para voltar a enviar solicitações.",
    ownerAction: "Regularizar assinatura",
    memberDescription:
      "A assinatura desta conta está suspensa. Contate o administrador da conta para regularizar o pagamento.",
  },
  subscription_canceled: {
    tone: "danger",
    icon: XCircle,
    title: "Assinatura cancelada",
    ownerDescription:
      "Sua assinatura foi cancelada. Contrate um plano para voltar a enviar solicitações.",
    ownerAction: "Ver planos",
    memberDescription:
      "A assinatura desta conta foi cancelada. Contate o administrador da conta para contratar um plano.",
  },
  trial_expired: {
    tone: "warning",
    icon: AlertTriangle,
    title: "Período de teste encerrado",
    ownerDescription:
      "Seu período de teste terminou. Escolha um plano para continuar enviando solicitações.",
    ownerAction: "Ver planos",
    memberDescription:
      "O período de teste desta conta terminou. Contate o administrador da conta para contratar um plano.",
  },
  payment_method_required: {
    tone: "danger",
    icon: CreditCard,
    title: "Método de pagamento necessário",
    ownerDescription:
      "Cadastre um método de pagamento para continuar enviando solicitações.",
    ownerAction: "Cadastrar pagamento",
    memberDescription:
      "A assinatura desta conta precisa de um método de pagamento. Contate o administrador da conta.",
  },
};

const TONE_STYLES: Record<
  Tone,
  { iconWrap: string; icon: string; cta: string; highlight: string }
> = {
  warning: {
    iconWrap: "bg-amber-50 ring-amber-100",
    icon: "text-amber-500",
    cta: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
    highlight: "border-amber-200 bg-amber-50/60",
  },
  danger: {
    iconWrap: "bg-rose-50 ring-rose-100",
    icon: "text-rose-500",
    cta: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
    highlight: "border-rose-200 bg-rose-50/60",
  },
};

function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? ""
    : data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

/**
 * Aviso de bloqueio comercial (HTTP 402): cota do plano atingida, assinatura
 * suspensa/cancelada, trial expirado.
 *
 * A cópia muda conforme quem está na frente da tela. Só o **dono da conta**
 * (`isAccountOwner`) gerencia plano e pagamento — e só ele enxerga a aba de
 * plano em `/configuracoes`. Para os demais (inclusive o admin delegado), o
 * CTA seria um beco sem saída, então o modal orienta a procurar o
 * administrador da conta.
 */
export function BillingLimitModal({ isOpen, onClose, block }: Props) {
  const { isAccountOwner, subscription } = useAuth();

  const copy: Copy =
    block.reason === "unknown"
      ? {
          tone: "danger",
          icon: AlertTriangle,
          title: "Ação bloqueada pela assinatura",
          ownerDescription: block.message,
          ownerAction: "Ver planos",
          memberDescription: `${block.message} Contate o administrador da conta para resolver.`,
        }
      : COPY[block.reason];

  const styles = TONE_STYLES[copy.tone];
  const Icon = copy.icon;
  const quota = subscription?.quota ?? null;
  const mostrarCota =
    block.reason === "quota_exceeded" && !!quota && !quota.isUnlimited;
  const renovaEm = quota?.periodEnd ? formatarData(quota.periodEnd) : "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={copy.title} size="sm">
      <div className="ds-modal-body flex flex-col items-center gap-4 text-center">
        <div className={cn("rounded-2xl p-3 ring-1", styles.iconWrap)}>
          <Icon className={cn("h-7 w-7", styles.icon)} aria-hidden="true" />
        </div>

        <p className="ds-body text-gray-600">
          {isAccountOwner ? copy.ownerDescription : copy.memberDescription}
        </p>

        {mostrarCota && quota && (
          <div
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-left",
              styles.highlight,
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="ds-caption font-medium text-gray-700">
                Solicitações do ciclo
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {quota.used} de {quota.limit}
              </span>
            </div>
            <div
              className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={quota.limit}
              aria-valuenow={quota.used}
              aria-label="Solicitações usadas no ciclo"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  copy.tone === "warning" ? "bg-amber-500" : "bg-rose-500",
                )}
                style={{
                  width: `${Math.min(100, quota.limit > 0 ? (quota.used / quota.limit) * 100 : 100)}%`,
                }}
              />
            </div>
            {renovaEm && (
              <p className="ds-caption mt-2">
                A cota renova em <span className="font-medium">{renovaEm}</span>.
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className="flex flex-col-reverse gap-2 border-t border-gray-200 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 md:px-6 md:py-4"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-[0.98] sm:w-auto"
        >
          {isAccountOwner ? "Agora não" : "Entendi"}
        </button>

        {isAccountOwner && (
          <Link
            href={PLAN_TAB_HREF}
            onClick={onClose}
            className={cn(
              "inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto",
              styles.cta,
            )}
          >
            {copy.ownerAction}
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
      </div>
    </Modal>
  );
}
