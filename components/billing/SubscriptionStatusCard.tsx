"use client";

import { CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  formatDateBR,
  formatPriceCents,
  SUBSCRIPTION_STATUS_LABEL,
  SUBSCRIPTION_STATUS_TONE,
} from "@/lib/billing-format";
import type { SubscriptionDetail } from "@/types";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

interface Props {
  detail: SubscriptionDetail;
}

const TONE_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
};

export function SubscriptionStatusCard({ detail }: Props) {
  const { subscription, plan, daysLeftInTrial } = detail;
  const status = subscription.status;
  const tone = SUBSCRIPTION_STATUS_TONE[status];
  const Icon = (() => {
    switch (status) {
      case "active":
        return CheckCircle2;
      case "trialing":
        return Clock;
      case "past_due":
        return AlertCircle;
      case "suspended":
      case "canceled":
        return XCircle;
      default:
        return CalendarClock;
    }
  })();

  return (
    <div className="border border-gray-200 rounded-2xl bg-gradient-to-r from-primary-50 to-white">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "p-3 rounded-2xl border",
                TONE_STYLES[tone] ?? TONE_STYLES.neutral,
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Status da assinatura
              </p>
              <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                {plan?.name ?? "—"}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {plan?.description ?? "Plano não identificado"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
                    TONE_STYLES[tone] ?? TONE_STYLES.neutral,
                  )}
                >
                  {SUBSCRIPTION_STATUS_LABEL[status]}
                </span>
                {subscription.cancelAtPeriodEnd && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                    Cancela em{" "}
                    {formatDateBR(subscription.currentPeriodEnd)}
                  </span>
                )}
                {detail.nextPlan && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
                    Próximo ciclo: {detail.nextPlan.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right md:text-right">
            {plan && (
              <p className="text-2xl font-bold text-gray-900">
                {formatPriceCents(plan.priceCents, plan.currency)}
                <span className="text-sm font-normal text-gray-500">
                  {plan.billingPeriod === "MONTHLY" ? "/mês" : "/ano"}
                </span>
              </p>
            )}
            {status === "trialing" && daysLeftInTrial != null && (
              <p className="text-xs text-gray-500 mt-1">
                {daysLeftInTrial > 0
                  ? `Restam ${daysLeftInTrial} dia(s) de teste`
                  : "Teste expira hoje"}
              </p>
            )}
            {status === "active" && !subscription.cancelAtPeriodEnd && (
              <p className="text-xs text-gray-500 mt-1">
                Próxima cobrança em{" "}
                {formatDateBR(subscription.currentPeriodEnd)}
              </p>
            )}
            {status === "past_due" && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Pagamento em atraso desde{" "}
                {formatDateBR(subscription.pastDueSince)}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
