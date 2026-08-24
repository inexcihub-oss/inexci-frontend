"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, X } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useDismissedQuotaThresholds } from "@/hooks/useDismissedQuotaThresholds";
import { useQuota } from "@/hooks/useQuota";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { resolveQuotaBanner, type BannerTone } from "@/lib/quota-banner";

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

const PROGRESS_VARIANTS: Record<BannerTone, "info" | "warning" | "danger"> = {
  info: "info",
  warning: "warning",
  danger: "danger",
};

interface QuotaBannerProps {
  /**
   * Renderizado no lugar do aviso de cota quando não há nada a mostrar (sem
   * dado carregado, abaixo do primeiro degrau, ou plano ilimitado). É o que
   * dá lugar a um banner de precedência menor — hoje, o de onboarding — sem
   * que `GlobalBanners` precise duplicar a lógica de degrau/dispensa daqui
   * só para decidir se cede a vez.
   */
  fallback?: React.ReactNode;
}

/**
 * Aviso de consumo da cota de solicitações cirúrgicas, no topo de todas as
 * páginas do dashboard.
 *
 * Aparece em três degraus (75%, 90%, 100%) para **qualquer** usuário com
 * permissão de solicitações — é ele quem esbarra no limite ao enviar. Só o
 * dono da conta ganha o CTA de upgrade; os demais leem para quem falar.
 *
 * O número absoluto ("faltam 3 de 20") é o título porque é sobre ele que se
 * age; o percentual fica na barra, que comunica proporção sem ocupar texto.
 */
export function QuotaBanner({ fallback = null }: QuotaBannerProps = {}) {
  const { isAccountOwner, accountId } = useAuth();
  const { data: quota } = useQuota();
  const { dismissed, dismiss, pronto } = useDismissedQuotaThresholds(
    accountId,
    quota?.periodEnd,
  );

  const variant = resolveQuotaBanner({
    quota,
    isAccountOwner,
    dismissedThresholds: dismissed,
  });

  // `pronto` evita o piscar do aviso para quem já o fechou: o localStorage só
  // é legível depois da hidratação. Enquanto isso, nem o fallback aparece —
  // trocar de onboarding para cota um instante depois seria o mesmo piscar
  // que este flag existe para evitar.
  if (!pronto) return null;
  if (!variant) return <>{fallback}</>;

  return (
    <div className="bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:p-4 md:flex-row md:items-center md:justify-between",
          CONTAINER_STYLES[variant.tone],
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/80 p-2 shadow-sm ring-1 ring-black/5">
            <AlertTriangle
              className={cn("h-5 w-5 shrink-0", ICON_STYLES[variant.tone])}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="pr-8 text-sm font-semibold sm:text-[15px] md:pr-0">
              {variant.title}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <ProgressBar
                value={variant.progressPercent}
                size="sm"
                variant={PROGRESS_VARIANTS[variant.tone]}
                className="min-w-0 flex-1"
              />
              <span className="shrink-0 text-xs font-medium tabular-nums opacity-80">
                {variant.usageLabel}
              </span>
            </div>

            <p className="mt-1.5 text-xs leading-relaxed opacity-90 sm:text-sm">
              {variant.description}
            </p>
          </div>
        </div>

        {variant.showUpgradeCta && (
          <Link
            href="/configuracoes?tab=plan"
            className={cn(
              "inline-flex min-h-[40px] w-full shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:min-h-[38px] md:w-auto",
              BUTTON_STYLES[variant.tone],
            )}
          >
            Fazer upgrade
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        )}

        {variant.dismissible && (
          <button
            type="button"
            onClick={() => dismiss(variant.threshold)}
            aria-label="Dispensar aviso de cota"
            className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 md:static md:h-8 md:w-8"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
