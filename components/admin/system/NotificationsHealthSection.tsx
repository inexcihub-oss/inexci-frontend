"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, HelpCircle, RefreshCw, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { formatDateTimeSP } from "@/lib/admin-audit";
import { HEALTH_CHANNELS, channelHealth } from "@/lib/admin-system";
import { adminKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { adminService } from "@/services/admin.service";

const STATE_META = {
  up: {
    label: "Operando",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700",
    iconClass: "text-emerald-600",
  },
  down: {
    label: "Fora do ar",
    icon: XCircle,
    badge: "bg-red-50 text-red-700",
    iconClass: "text-red-600",
  },
  unknown: {
    label: "Sem informação",
    icon: HelpCircle,
    badge: "bg-gray-100 text-gray-600",
    iconClass: "text-gray-400",
  },
} as const;

export function NotificationsHealthSection() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } =
    useQuery({
      queryKey: adminKeys.notificationsHealth(),
      queryFn: () => adminService.getNotificationsHealth(),
      staleTime: 0,
      retry: false,
    });

  const lastCheck = dataUpdatedAt
    ? formatDateTimeSP(new Date(dataUpdatedAt))
    : null;

  return (
    <section aria-labelledby="system-health-title" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="system-health-title" className="ds-section-title">
            Saúde das notificações
          </h2>
          <p className="text-xs text-neutral-500">
            {lastCheck
              ? `Última verificação: ${lastCheck}`
              : "Conexão com os canais usados para avisar clínicas e pacientes"}
          </p>
        </div>
        <button
          type="button"
          className="ds-btn-inline inline-flex items-center gap-1.5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
            aria-hidden="true"
          />
          {isFetching ? "Verificando..." : "Verificar novamente"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Não foi possível verificar os canais"
          description="A verificação não respondeu. Tente novamente em instantes."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {HEALTH_CHANNELS.map((channel) => {
            const health = channelHealth(data, channel.key);
            const meta = STATE_META[health.state];
            const Icon = meta.icon;
            return (
              <Card
                key={channel.key}
                data-testid={`health-card-${channel.key}`}
                className="rounded-2xl border border-gray-200"
              >
                <CardContent className="space-y-2 p-3.5 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn("h-5 w-5 shrink-0", meta.iconClass)}
                        aria-hidden="true"
                      />
                      <h3 className="text-sm font-semibold text-neutral-900">
                        {channel.label}
                      </h3>
                    </div>
                    <span
                      className={cn(
                        "ds-badge-md whitespace-nowrap font-semibold",
                        meta.badge,
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {channel.description}
                  </p>
                  {health.message && (
                    <p className="break-words rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                      {health.message}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
