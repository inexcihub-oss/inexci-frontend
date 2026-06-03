"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import { formatPriceCents, quotaLabel } from "@/lib/billing-format";

export interface PlanCardTheme {
  headerGradient: string;
  ring: string;
  ctaBg: string;
  priceColor: string;
  dotColor: string;
  glowShadow: string;
  badgeBg: string;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  icon: LucideIcon;
  theme: PlanCardTheme;
  highlight?: boolean;
  selected: boolean;
  onSelect: () => void;
}

export function PlanCard({
  plan,
  icon: Icon,
  theme,
  highlight = false,
  selected,
  onSelect,
}: PlanCardProps) {
  const isEnterprise = plan.priceCents === 0 && plan.surgeryRequestQuota === -1;
  const isDisabled = !plan.isTrialDefault && !isEnterprise;

  return (
    <div className="relative h-full flex flex-col pt-4">
      {highlight && (
        <div className="absolute top-0 inset-x-0 flex justify-center z-10">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white shadow-md ${theme.badgeBg}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            Mais popular
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={isDisabled ? undefined : onSelect}
        disabled={isDisabled}
        aria-pressed={selected}
        className={[
          "group flex-1 flex flex-col w-full text-left rounded-2xl overflow-hidden bg-white transition-all duration-300",
          isDisabled
            ? "border border-gray-200 opacity-60 cursor-not-allowed"
            : selected
              ? `${theme.ring} border-2 shadow-xl ${theme.glowShadow} -translate-y-0.5`
              : "border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300",
          highlight && !selected && !isDisabled ? "border-purple-200 shadow-md" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Gradient header */}
        <div
          className={`px-4 pt-4 pb-4 bg-gradient-to-br ${theme.headerGradient}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
              <Icon className="w-5 h-5 text-white" />
            </div>
            {!isEnterprise && (
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                  selected
                    ? "bg-white/30 border-white/60"
                    : "border-white/40 bg-white/10"
                }`}
              >
                {selected && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
            )}
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
          ) : plan.isTrialDefault ? (
            <>
              <p className={`text-xl font-extrabold ${theme.priceColor}`}>
                30 dias grátis
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Depois {formatPriceCents(plan.priceCents, plan.currency)}/mês ·
                Sem cartão
              </p>
            </>
          ) : plan.billingPeriod === "YEARLY" ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-gray-900">
                  {formatPriceCents(
                    Math.round(plan.priceCents / 12),
                    plan.currency
                  )}
                </span>
                <span className="text-[10px] text-gray-400 ml-0.5">/mês</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formatPriceCents(plan.priceCents, plan.currency)}/ano · 2
                meses grátis
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-gray-900">
                  {formatPriceCents(plan.priceCents, plan.currency)}
                </span>
                <span className="text-[10px] text-gray-400 ml-0.5">/mês</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Cancele quando quiser
              </p>
            </>
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
              onClick={(e) => e.stopPropagation()}
              className={`block w-full text-center rounded-xl py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${theme.ctaBg}`}
            >
              Vamos conversar
            </a>
          ) : (
            <div
              className={`w-full rounded-xl py-2.5 text-xs font-semibold text-center transition-all ${
                isDisabled
                  ? "bg-gray-100 text-gray-400 border border-gray-100"
                  : selected
                    ? `${theme.ctaBg} text-white shadow-sm`
                    : "bg-gray-50 text-gray-500 border border-gray-100 group-hover:bg-gray-100 group-hover:text-gray-700"
              }`}
            >
              {isDisabled ? "Em breve" : selected ? "✓ Plano selecionado" : "Selecionar plano"}
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
