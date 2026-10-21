"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/Spinner";
import { Pagination } from "@/components/finance/receivables/Pagination";
import { CashSessionReportButton } from "@/components/finance/reports/CashSessionReportButton";
import { formatDateTime } from "@/components/finance/receivables/format";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { decimalToCents, formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

const LIMITE = 20;

export function CashHistory() {
  const [pagina, setPagina] = useState(1);
  const params = { page: pagina, limit: LIMITE };
  const { data, isLoading, isError } = useQuery({
    queryKey: financeKeys.cashSessionList(params),
    queryFn: () => financeService.listCashSessions(params),
    placeholderData: keepPreviousData,
  });

  return (
    <section aria-labelledby="caixa-historico" className="flex flex-col gap-2">
      <h3
        id="caixa-historico"
        className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Histórico de caixas
      </h3>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">
          Não foi possível carregar o histórico de caixas.
        </p>
      ) : !data || data.data.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum caixa registrado.</p>
      ) : (
        <>
          <ul
            aria-label="Histórico de caixas"
            className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
          >
            {data.data.map((s) => {
              const diferenca =
                s.difference === null ? null : decimalToCents(s.difference);
              return (
                <li
                  key={s.id}
                  className="px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {s.account.name} · {s.user.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDateTime(s.openedAt)}
                      {s.closedAt
                        ? ` até ${formatDateTime(s.closedAt)}`
                        : " · aberto"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {s.countedAmount !== null
                        ? formatMoney(s.countedAmount)
                        : "—"}
                    </p>
                    {diferenca !== null && diferenca !== 0 && (
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          diferenca > 0 ? "text-blue-700" : "text-red-700",
                        )}
                      >
                        {diferenca > 0 ? "Sobra" : "Falta"}{" "}
                        {formatMoney(s.difference?.replace("-", ""))}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full justify-end sm:w-auto">
                    <CashSessionReportButton sessionId={s.id} />
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onChange={setPagina}
          />
        </>
      )}
    </section>
  );
}
