"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import { formatPriceCents, quotaLabel } from "@/lib/billing-format";

export interface PlanCardTheme {
  /** Gradient aplicado no card (Tailwind classes from-/via-/to-). */
  gradient: string;
  /** Cor s\u00f3lida usada em destaques (preço, badge, ícone). */
  accent: string;
  /** Cor aplicada na label do badge "Mais popular". */
  badgeBg: string;
  badgeText: string;
  /** Classe Tailwind para o anel/borda quando o card est\u00e1 selecionado. */
  ring: string;
  /** Classe Tailwind para a cor do botão selecionar. */
  buttonBg: string;
  buttonText: string;
  /** Cor de background do bloco do ícone. */
  iconBg: string;
  iconColor: string;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  /** Lista de features adicionais do plano (al\u00e9m da cota mensal). */
  features: string[];
  /** \u00cdcone exibido no topo do card. */
  icon: LucideIcon;
  theme: PlanCardTheme;
  /** Quando true, plano \u00e9 destacado como "Mais popular". */
  highlight?: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Mostra "Free Trial \u2014 30 dias gr\u00e1tis" no lugar do pre\u00e7o quando true. */
  trialMode?: boolean;
}

export function PlanCard({
  plan,
  features,
  icon: Icon,
  theme,
  highlight = false,
  selected,
  onSelect,
  trialMode = false,
}: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative w-full text-left rounded-3xl p-6 lg:p-7 transition-all duration-300
        bg-gradient-to-br ${theme.gradient}
        border ${selected ? theme.ring : "border-white/10"}
        ${selected ? "shadow-2xl scale-[1.02]" : "shadow-lg hover:shadow-xl hover:scale-[1.01]"}
        ${highlight ? "ring-2 ring-offset-2 ring-offset-slate-900 ring-purple-400/60" : ""}
      `}
    >
      {highlight && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-lg ${theme.badgeBg} ${theme.badgeText}`}
        >
          <Sparkles className="w-3 h-3" />
          Mais popular
        </span>
      )}

      {/* Glow decorativo */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-30 ${theme.accent}`}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Cabe\u00e7alho */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${theme.iconBg}`}
          >
            <Icon className={`w-5 h-5 ${theme.iconColor}`} />
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${
              selected
                ? `${theme.buttonBg} border-transparent`
                : "border-white/30"
            }`}
          >
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>

        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <p className="text-xs text-white/70 mt-1 mb-5 line-clamp-2 min-h-[32px]">
          {plan.description}
        </p>

        {/* Pre\u00e7o */}
        <div className="mb-5 pb-5 border-b border-white/10">
          {trialMode ? (
            <div>
              <p className="text-2xl font-bold text-white">30 dias grátis</p>
              <p className="text-xs text-white/60 mt-1">
                Sem cartão de crédito · Cancele quando quiser
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">
                  {formatPriceCents(plan.priceCents, plan.currency)}
                </span>
                <span className="text-xs text-white/60">
                  {plan.billingPeriod === "MONTHLY" ? "/mês" : "/ano"}
                </span>
              </div>
              <p className="text-[11px] text-white/60 mt-1">
                Comece com 30 dias grátis · Sem cartão agora
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2.5 flex-1">
          <li className="flex items-start gap-2 text-sm text-white/90">
            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${theme.iconColor}`} />
            <span className="font-medium">
              {quotaLabel(plan.surgeryRequestQuota)}
            </span>
          </li>
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-white/80"
            >
              <Check
                className={`w-4 h-4 mt-0.5 shrink-0 ${theme.iconColor}`}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Bot\u00e3o */}
        <div
          className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold text-center transition-all ${
            selected
              ? `${theme.buttonBg} ${theme.buttonText} shadow-lg`
              : "bg-white/10 text-white border border-white/20 group-hover:bg-white/15"
          }`}
        >
          {selected ? "Plano selecionado" : "Selecionar plano"}
        </div>
      </div>
    </button>
  );
}
