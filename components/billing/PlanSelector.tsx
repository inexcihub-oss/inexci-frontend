"use client";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  formatPriceCents,
  billingPeriodLabel,
  quotaLabel,
} from "@/lib/billing-format";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types";
import { Check, Loader2, Mail } from "lucide-react";

interface Props {
  plans: SubscriptionPlan[];
  currentPlanId: string | null;
  subscriptionStatus: SubscriptionStatus;
  onCheckout: (plan: SubscriptionPlan) => void;
  onManage: () => void;
  loading?: boolean;
  redirecting?: boolean;
}

export function PlanSelector({
  plans,
  currentPlanId,
  subscriptionStatus,
  onCheckout,
  onManage,
  loading,
  redirecting,
}: Props) {
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

  const goesThruCheckout =
    subscriptionStatus === "trialing" || subscriptionStatus === "canceled";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isEnterprise =
          plan.slug === "enterprise" || !plan.gatewayPriceId;

        const buttonLabel = isCurrent
          ? "Plano atual"
          : goesThruCheckout
            ? "Assinar este plano"
            : "Fazer upgrade/downgrade";

        const handleClick = isCurrent
          ? undefined
          : goesThruCheckout
            ? () => onCheckout(plan)
            : () => onManage();

        return (
          <div
            key={plan.id}
            className={cn(
              "relative border rounded-2xl p-6 transition-all flex flex-col",
              isCurrent
                ? "bg-primary-50 border-primary-500 shadow-lg shadow-primary-100"
                : "border-gray-200",
            )}
          >
            {isCurrent && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Plano atual
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-900">
              {plan.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1 min-h-[40px]">
              {plan.description ?? ""}
            </p>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">
                {formatPriceCents(plan.priceCents, plan.currency)}
                <span className="text-sm font-normal text-gray-500">
                  {billingPeriodLabel(plan.billingPeriod)}
                </span>
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-700 flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>{quotaLabel(plan.surgeryRequestQuota)}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Equipe ilimitada de colaboradores</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>Notificações por e-mail e WhatsApp</span>
              </li>
            </ul>

            {isEnterprise && !isCurrent ? (
              <a
                href="mailto:contato@inexci.com.br"
                className="mt-6 inline-flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[40px]"
              >
                <Mail className="w-4 h-4" />
                Fale conosco
              </a>
            ) : (
              <Button
                variant={isCurrent ? "outline" : "primary"}
                className="w-full mt-6"
                disabled={isCurrent || redirecting}
                onClick={handleClick}
              >
                {buttonLabel}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
