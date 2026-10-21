"use client";

import { formatDateTime } from "@/components/finance/receivables/format";
import { CashSessionReportButton } from "@/components/finance/reports/CashSessionReportButton";
import { decimalToCents, formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  FINANCIAL_ENTRY_KIND_LABELS,
  FinancialEntryDirection,
  PAYMENT_METHOD_LABELS,
  type CashSessionSummaryDto,
} from "@/types/finance.types";

interface CashSessionPanelProps {
  session: CashSessionSummaryDto;
}

export function CashSessionPanel({ session }: CashSessionPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-teal-50 px-3 py-3">
          <p className="text-xs text-teal-800">Saldo em dinheiro</p>
          <p data-testid="saldo-caixa" className="text-2xl font-bold text-teal-900">
            {formatMoney(session.cashBalance)}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-3">
          <p className="text-xs text-neutral-500">Abertura</p>
          <p className="text-lg font-semibold text-neutral-900">
            {formatMoney(session.openingAmount)}
          </p>
          <p className="text-xs text-neutral-500">
            {formatDateTime(session.openedAt)}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-3">
          <p className="text-xs text-neutral-500">Caixa</p>
          <p className="text-lg font-semibold text-neutral-900 truncate">
            {session.account.name}
          </p>
          <p className="text-xs text-neutral-500">{session.user.name}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <CashSessionReportButton sessionId={session.id} />
      </div>

      <section aria-labelledby="caixa-por-forma">
        <h3
          id="caixa-por-forma"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
        >
          Recebimentos por forma
        </h3>
        {session.totalsByMethod.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum recebimento ainda.</p>
        ) : (
          <ul
            aria-label="Recebimentos por forma"
            className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
          >
            {session.totalsByMethod.map((t) => (
              <li
                key={t.method}
                className="px-3 py-2 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-900">
                    {PAYMENT_METHOD_LABELS[t.method]}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Recebido {formatMoney(t.received)}
                    {decimalToCents(t.refunded) > 0 && (
                      <span className="text-red-700">
                        {" "}
                        · Estornado {formatMoney(t.refunded)}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-900 tabular-nums shrink-0">
                  {formatMoney(t.net)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="caixa-movimentos">
        <h3
          id="caixa-movimentos"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
        >
          Movimentos em dinheiro
        </h3>
        {session.entries.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum movimento.</p>
        ) : (
          <ul
            aria-label="Movimentos do caixa"
            className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
          >
            {session.entries.map((e) => {
              const entrada = e.direction === FinancialEntryDirection.IN;
              return (
                <li key={e.id} className="px-3 py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 truncate">
                      {FINANCIAL_ENTRY_KIND_LABELS[e.kind]}
                      {e.description && ` · ${e.description}`}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDateTime(e.occurredAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      entrada ? "text-green-700" : "text-red-700",
                    )}
                  >
                    {entrada ? "+" : "−"} {formatMoney(e.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
