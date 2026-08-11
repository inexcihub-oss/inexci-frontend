"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Clock, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  BillingBannerIcon,
  BillingBannerVariant,
} from "@/lib/billing-banner";
import type { BannerTone } from "@/lib/quota-banner";

const ICONS: Record<BillingBannerIcon, React.ElementType> = {
  clock: Clock,
  alert: AlertTriangle,
  x: XCircle,
};

const CONTAINER_STYLES: Record<BannerTone, string> = {
  info: "border-blue-200/90 bg-gradient-to-r from-blue-50 via-white to-blue-50/60 text-blue-950",
  warning:
    "border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 text-amber-950",
  danger:
    "border-rose-200/90 bg-gradient-to-r from-rose-50 via-white to-red-50/70 text-rose-950",
};

const ICON_STYLES: Record<BannerTone, string> = {
  info: "text-blue-500",
  warning: "text-amber-500",
  danger: "text-rose-500",
};

const BUTTON_STYLES: Record<BannerTone, string> = {
  info: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
  warning: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
  danger: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500",
};

/**
 * Banner de **estado da assinatura** (trial expirando, inadimplência,
 * suspensão, cancelamento agendado).
 *
 * Apresentação pura: a decisão de qual variante mostrar mora em
 * `resolveBillingBanner`, e quem monta o componente é `GlobalBanners`. Cota
 * não passa por aqui — é do `QuotaBanner`.
 *
 * Apenas o **dono da conta** vê este banner: todo CTA daqui aponta para a aba
 * de plano, que só existe para ele — um admin delegado era mandado para uma
 * aba que o redireciona de volta para "profile". Quem não é dono descobre o
 * bloqueio no ponto da ação, pelo `BillingLimitModal`, que orienta a procurar
 * o administrador da conta.
 */
export function BillingStatusBanner({
  variant,
}: {
  variant: BillingBannerVariant;
}) {
  const Icon = ICONS[variant.icon];

  return (
    <div className="bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:p-4 md:flex-row md:items-center md:justify-between",
          CONTAINER_STYLES[variant.tone],
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5">
            <Icon className={cn("h-5 w-5 shrink-0", ICON_STYLES[variant.tone])} />
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
            BUTTON_STYLES[variant.tone],
          )}
        >
          {variant.action}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
