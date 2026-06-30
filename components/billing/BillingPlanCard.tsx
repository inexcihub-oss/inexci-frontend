"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Loader2, Mail, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import type { PlanCardTheme } from "@/components/cadastro/PlanCard";
import { formatPriceCents, quotaLabel } from "@/lib/billing-format";

interface BillingPlanCardProps {
  plan: SubscriptionPlan;
  icon: LucideIcon;
  theme: PlanCardTheme;
  highlight?: boolean;
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
  loading?: boolean;
  onSelect: () => void;
}

export function BillingPlanCard({
  plan,
  icon: Icon,
  theme,
  highlight = false,
  isCurrent,
  ctaLabel,
  ctaDisabled = false,
  loading = false,
  onSelect,
}: BillingPlanCardProps) {
  const isEnterprise = plan.slug === "enterprise" || !plan.gatewayPriceId;

  return (
    <div className="relative h-full flex flex-col pt-4">
      {(isCurrent || highlight) && (
        <div className="absolute top-0 inset-x-0 flex justify-center z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-md ${
              isCurrent ? "bg-emerald-500" : theme.badgeBg
            }`}
          >
            {isCurrent ? (
              <Check className="w-2.5 h-2.5" strokeWidth={3} />
            ) : (
              <Sparkles className="w-2.5 h-2.5" />
            )}
            {isCurrent ? "Plano atual" : "Mais popular"}
          </span>
        </div>
      )}

      <div
        className={[
          "flex-1 flex flex-col w-full rounded-2xl overflow-hidden bg-white transition-all duration-300",
          isCurrent
            ? `${theme.ring} border-2 shadow-xl ${theme.glowShadow}`
            : "border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300",
          highlight && !isCurrent ? "border-purple-200 shadow-md" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Gradient header */}
        <div
          className={`px-4 pt-4 pb-4 bg-gradient-to-br ${theme.headerGradient}`}
        >
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-white leading-tight">
            {plan.name}
          </h3>
          <p className="mt-1 text-[10px] text-white/70 line-clamp-2 min-h-[28px] leading-relaxed">
            {plan.description ?? ""}
          </p>
        </div>

        {/* Price */}
        <div className="px-4 py-3.5 border-b border-gray-50">
          {isEnterprise ? (
            <>
              <p className={`text-xl font-extrabold ${theme.priceColor}`}>
                Sob consulta
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Fale com nossa equipe comercial
              </p>
            </>
          ) : plan.billingPeriod === "YEARLY" ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-gray-900">
                  {formatPriceCents(plan.priceCents, plan.currency)}
                </span>
                <span className="text-[10px] text-gray-400 ml-0.5">/ano</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Equivale a{" "}
                {formatPriceCents(
                  Math.round(plan.priceCents / 12),
                  plan.currency,
                )}
                /mês · 2 meses grátis
              </p>
            </>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-gray-900">
                {formatPriceCents(plan.priceCents, plan.currency)}
              </span>
              <span className="text-[10px] text-gray-400 ml-0.5">/mês</span>
            </div>
          )}
        </div>

        {/* Quota — main differentiator */}
        <div className="px-4 py-3.5 flex-1 flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${theme.dotColor}`}
            />
            <span className="text-[11px] font-semibold text-gray-800">
              {quotaLabel(plan.surgeryRequestQuota)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4">
          {isEnterprise ? (
            <a
              href="mailto:contato@inexci.com.br"
              className={`inline-flex items-center justify-center gap-1.5 w-full text-center rounded-xl py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${theme.ctaBg}`}
            >
              <Mail className="w-3.5 h-3.5" />
              Fale conosco
            </a>
          ) : (
            <button
              type="button"
              onClick={isCurrent || ctaDisabled ? undefined : onSelect}
              disabled={isCurrent || ctaDisabled}
              className={`w-full rounded-xl py-2.5 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
                isCurrent
                  ? "bg-gray-100 text-gray-400 border border-gray-100 cursor-default"
                  : `${theme.ctaBg} text-white shadow-sm hover:opacity-90 disabled:opacity-60`
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {ctaLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
