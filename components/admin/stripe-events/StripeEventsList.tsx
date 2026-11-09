"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { canReprocess, stripeEventSituation } from "@/lib/admin-stripe-events";
import { cn, formatDateTime } from "@/lib/utils";
import type { AdminStripeEvent } from "@/services/admin.service";

export function StripeEventsList({
  items,
  showAccount = true,
  emptyTitle = "Nenhum evento",
  emptyDescription = "Os avisos que a Stripe enviar aparecem aqui.",
  onReprocess,
}: {
  items: AdminStripeEvent[];
  showAccount?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onReprocess: (event: AdminStripeEvent) => void;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
      {items.map((event) => {
        const situation = stripeEventSituation(event);
        return (
          <li
            key={event.id}
            className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("ds-badge-sm", situation.className)}>
                  {situation.label}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {event.label}
                </span>
                {event.gatewayType && (
                  <span className="min-w-0 break-all font-mono text-xs text-gray-500">
                    {event.gatewayType}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Recebido em {formatDateTime(event.createdAt)}
                {event.processedAt && (
                  <> · processado em {formatDateTime(event.processedAt)}</>
                )}
                {showAccount && (
                  <>
                    {" · "}
                    {event.ownerId ? (
                      <Link
                        href={`/admin/clientes/${event.ownerId}?tab=assinatura`}
                        className="font-medium text-primary-700 hover:underline"
                      >
                        {event.ownerName ?? "Abrir conta"}
                      </Link>
                    ) : (
                      "conta não identificada"
                    )}
                  </>
                )}
              </p>
              {event.error && (
                <p className="mt-1.5 [overflow-wrap:anywhere] rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                  {event.error}
                </p>
              )}
              {event.warning && (
                <p className="mt-1.5 flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {event.warning}
                </p>
              )}
              <p className="mt-1 break-all font-mono text-[11px] text-gray-400">
                {event.eventId}
              </p>
            </div>
            {canReprocess(event) && (
              <div className="flex shrink-0">
                <button
                  type="button"
                  onClick={() => onReprocess(event)}
                  className="ds-toolbar-btn"
                  aria-label={`Reprocessar ${event.label} de ${formatDateTime(event.createdAt)}`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reprocessar
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
