"use client";

import { Card, CardContent } from "@/components/ui/Card";
import type { QuotaSnapshot } from "@/types";
import { formatDateBR } from "@/lib/billing-format";
import { Activity } from "lucide-react";

interface Props {
  quota: QuotaSnapshot | null;
}

export function QuotaUsageCard({ quota }: Props) {
  if (!quota) {
    return (
      <Card className="border border-gray-200 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500">
              Cota não disponível para esta assinatura.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { used, limit, isUnlimited, remaining, periodStart, periodEnd } = quota;
  const percentage = isUnlimited
    ? 0
    : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const barColor = (() => {
    if (isUnlimited) return "bg-primary-500";
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-primary-500";
  })();

  return (
    <Card className="border border-gray-200 rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Activity className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Uso de solicitações
            </p>
            <p className="text-xs text-gray-500">
              Ciclo atual: {formatDateBR(periodStart)} a{" "}
              {formatDateBR(periodEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {used}
            {!isUnlimited && (
              <span className="text-sm font-normal text-gray-500">
                {" "}
                / {limit}
              </span>
            )}
          </span>
          <span className="text-xs font-medium text-gray-500">
            {isUnlimited
              ? "Ilimitado"
              : `${remaining} solicitação${remaining === 1 ? "" : "ões"} restantes`}
          </span>
        </div>

        {!isUnlimited && (
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
