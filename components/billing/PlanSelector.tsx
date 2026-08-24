"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types";
import { getPresentation } from "@/components/cadastro/CadastroSteps";
import { BillingPlanCard } from "./BillingPlanCard";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string | null;
  subscriptionStatus: SubscriptionStatus;
  onCheckout: (plan: SubscriptionPlan) => void;
  onManage: (plan?: SubscriptionPlan) => void;
  loading?: boolean;
  redirecting?: boolean;
}

const SHARED_FEATURES = [
  "Equipe ilimitada de colaboradores",
  "Notificações por e-mail e WhatsApp",
  "Kanban e gestão de solicitações cirúrgicas",
  "Assistente de IA via WhatsApp",
];

const GRID_COLS_CLASS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function PlanSelector({
  plans,
  currentPlanId,
  subscriptionStatus,
  onCheckout,
  onManage,
  loading,
  redirecting,
}: Props) {
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "YEARLY">(
    currentPlan?.billingPeriod ?? "MONTHLY",
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="ml-2 text-sm text-gray-500">Carregando planos...</span>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        Nenhum plano disponível no momento.
      </p>
    );
  }

  /**
   * Enquanto o plano não foi contratado de fato — trial em curso ou assinatura
   * cancelada — `subscription.planId` guarda apenas a *escolha* feita no
   * cadastro, não um contrato. Tratar esse card como "Plano atual" (e
   * desabilitá-lo) trancava justamente o único plano que o usuário queria
   * pagar: o que ele havia selecionado no teste.
   */
  const goesThruCheckout =
    subscriptionStatus === "trialing" || subscriptionStatus === "canceled";

  const enterprisePlan = plans.find((p) => p.slug === "enterprise");
  const sortedPlans = [...plans]
    .filter((p) => p.slug !== "enterprise" && p.billingPeriod === billingPeriod)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const allPlans = [...sortedPlans, ...(enterprisePlan ? [enterprisePlan] : [])];

  const colClass =
    GRID_COLS_CLASS[allPlans.length] ??
    "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  /** Plano já contratado no gateway — só existe fora do fluxo de checkout. */
  const isContractedPlan = (plan: SubscriptionPlan) =>
    !goesThruCheckout && plan.id === currentPlanId;

  /** Plano escolhido no teste: destacado, mas assinável. */
  const isTrialSelection = (plan: SubscriptionPlan) =>
    goesThruCheckout && plan.id === currentPlanId;

  const ctaLabelFor = (isCurrent: boolean) =>
    isCurrent
      ? "Plano atual"
      : goesThruCheckout
        ? "Assinar este plano"
        : "Fazer upgrade/downgrade";

  const handleSelect = (plan: SubscriptionPlan) =>
    goesThruCheckout ? onCheckout(plan) : onManage(plan);

  return (
    <div className="space-y-6" data-tour="plano-planos-disponiveis">
      {/* Toggle Mensal / Anual */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingPeriod("MONTHLY")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              billingPeriod === "MONTHLY"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("YEARLY")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
              billingPeriod === "YEARLY"
                ? "bg-teal-500 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Anual
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
              -2 meses
            </span>
          </button>
        </div>
      </div>

      {/* Mobile: carrossel */}
      <div className="sm:hidden -mx-1 px-1">
        <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allPlans.map((plan) => {
            const presentation = getPresentation(plan.slug);
            const isCurrent = isContractedPlan(plan);
            return (
              <div
                key={plan.id}
                className="snap-center shrink-0 w-[72vw] max-w-[260px]"
              >
                <BillingPlanCard
                  plan={plan}
                  icon={presentation.icon}
                  theme={presentation.theme}
                  highlight={presentation.highlight}
                  isCurrent={isCurrent}
                  isTrialSelection={isTrialSelection(plan)}
                  loading={redirecting}
                  ctaDisabled={redirecting}
                  ctaLabel={ctaLabelFor(isCurrent)}
                  onSelect={() => handleSelect(plan)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Tablet/Desktop: grid dinâmico */}
      <div className={`hidden sm:grid gap-5 items-stretch ${colClass}`}>
        {allPlans.map((plan) => {
          const presentation = getPresentation(plan.slug);
          const isCurrent = isContractedPlan(plan);
          return (
            <BillingPlanCard
              key={plan.id}
              plan={plan}
              icon={presentation.icon}
              theme={presentation.theme}
              highlight={presentation.highlight}
              isCurrent={isCurrent}
              isTrialSelection={isTrialSelection(plan)}
              loading={redirecting}
              ctaDisabled={redirecting}
              ctaLabel={ctaLabelFor(isCurrent)}
              onSelect={() => handleSelect(plan)}
            />
          );
        })}
      </div>

      {/* Recursos inclusos em todos os planos */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          Incluído em todos os planos
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {SHARED_FEATURES.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 text-xs text-gray-600"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
