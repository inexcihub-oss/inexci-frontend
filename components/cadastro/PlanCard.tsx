"use client";

import type { LucideIcon } from "lucide-react";
import { Check, Sparkles } from "lucide-react";
import type { SubscriptionPlan } from "@/types";
import { formatPriceCents, quotaLabel } from "@/lib/billing-format";

/**
 * Tema visual de um plano (tema claro). Tokens de cor usados pelo PlanCard.
 */
export interface PlanCardTheme {
  /** Cor sólida do plano (botão de selecionado, anel, selo). */
  accent: string;
  /** Background do quadrado do ícone principal. */
  iconBg: string;
  /** Cor do ícone dentro do quadrado (texto sobre `iconBg`). */
  iconColor: string;
  /**
   * Cor dos checks na lista de features (separada de `iconColor` porque o
   * fundo da lista é sempre branco/claro, enquanto o iconBg é sólido escuro).
   */
  checkColor: string;
  /** Borda quando selecionado. */
  ringBorder: string;
  /** Background sutil quando selecionado. */
  selectedBg: string;
  /** Cor de destaque do preço/free trial. */
  priceColor: string;
  /** Gradiente sutil aplicado em planos com `highlight`. */
  highlightGradient?: string;
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  features: string[];
  icon: LucideIcon;
  theme: PlanCardTheme;
  /** Quando true, exibe selo "Mais popular" e dá um leve realce extra. */
  highlight?: boolean;
  selected: boolean;
  onSelect: () => void;
  /** Mostra "30 dias grátis" no lugar do preço quando true. */
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
      className={`group relative w-full h-full text-left rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 transition-all duration-300
        ${
          highlight && theme.highlightGradient
            ? `bg-gradient-to-br ${theme.highlightGradient}`
            : "bg-white"
        }
        ${
          selected
            ? `${theme.ringBorder} border-2 shadow-xl shadow-gray-200/60 -translate-y-0.5`
            : "border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
        }
      `}
    >
      {/* Selo "Mais popular" */}
      {highlight && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${theme.accent}`}
        >
          <Sparkles className="w-3 h-3" />
          Mais popular
        </span>
      )}

      <div className="flex flex-col h-full">
        {/* Cabeçalho: ícone + radio de seleção */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${theme.iconBg}`}
          >
            <Icon className={`w-5 h-5 ${theme.iconColor}`} />
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
              selected
                ? `${theme.accent} border-transparent`
                : "border-gray-300 group-hover:border-gray-400 bg-white"
            }`}
          >
            {selected && (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
        {plan.description && (
          <p className="mt-1 mb-4 text-xs text-gray-500 line-clamp-2 min-h-[32px]">
            {plan.description}
          </p>
        )}

        {/* Preço */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          {trialMode ? (
            <>
              <p className={`text-2xl font-extrabold ${theme.priceColor}`}>
                30 dias grátis
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Sem cartão · Cancele quando quiser
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-gray-900">
                  {formatPriceCents(plan.priceCents, plan.currency)}
                </span>
                <span className="text-xs text-gray-500">
                  {plan.billingPeriod === "MONTHLY" ? "/mês" : "/ano"}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Trial de 30 dias incluso · Sem cartão agora
              </p>
            </>
          )}
        </div>

        {/* Features — checks usam `checkColor` (cor escura sobre fundo claro) */}
        <ul className="space-y-2 flex-1">
          <li className="flex items-start gap-2 text-xs text-gray-700">
            <Check
              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.checkColor}`}
              strokeWidth={3}
            />
            <span className="font-semibold">
              {quotaLabel(plan.surgeryRequestQuota)}
            </span>
          </li>
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-xs text-gray-600"
            >
              <Check
                className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${theme.checkColor}`}
                strokeWidth={3}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div
          className={`mt-5 w-full rounded-xl py-2.5 text-xs font-semibold text-center transition-all ${
            selected
              ? `${theme.accent} text-white shadow-md`
              : "bg-gray-50 text-gray-700 group-hover:bg-gray-100 border border-gray-200"
          }`}
        >
          {selected ? "Plano selecionado" : "Selecionar plano"}
        </div>
      </div>
    </button>
  );
}
