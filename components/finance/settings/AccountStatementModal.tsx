"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { PeriodFilter } from "@/components/finance/reports/PeriodFilter";
import { ExportCsvButton } from "@/components/finance/reports/ExportCsvButton";
import { formatarDataHora } from "@/components/finance/reports/download";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { todayISODate } from "@/lib/calendar-date";
import { formatMoney } from "@/lib/currency";
import { erroDoPeriodo, primeiroDiaDoMes } from "@/lib/schemas/finance-reports";
import { cn } from "@/lib/utils";
import {
  FINANCIAL_ENTRY_KIND_LABELS,
  FinancialEntryDirection,
  type FinancialAccountDto,
} from "@/types/finance.types";

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Pick<FinancialAccountDto, "id" | "name"> | null;
}

function periodoInicial() {
  const hoje = todayISODate();
  return { from: primeiroDiaDoMes(hoje), to: hoje };
}

export function AccountStatementModal({
  isOpen,
  onClose,
  account,
}: AccountStatementModalProps) {
  const [periodo, setPeriodo] = useState(periodoInicial);

  useEffect(() => {
    if (isOpen) setPeriodo(periodoInicial());
  }, [isOpen, account?.id]);

  const erro = erroDoPeriodo(periodo);
  const habilitado = isOpen && !!account && !erro;

  const { data, isLoading, isError } = useQuery({
    queryKey: financeKeys.accountStatement(account?.id ?? "", periodo),
    queryFn: () => financeService.getAccountStatement(account!.id, periodo),
    enabled: habilitado,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={account ? `Extrato — ${account.name}` : "Extrato"}
      size="lg"
    >
      <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
        <PeriodFilter
          idPrefix="extrato"
          from={periodo.from}
          to={periodo.to}
          onChange={setPeriodo}
          error={erro}
        />

        {isLoading && habilitado ? (
          <p className="text-sm text-gray-500">Carregando extrato...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            Não foi possível carregar o extrato.
          </p>
        ) : data ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-100 px-3 py-2">
                <p className="text-xs font-semibold text-neutral-500">
                  Saldo inicial
                </p>
                <p
                  className="text-base font-bold tabular-nums"
                  aria-label="Valor do saldo inicial"
                >
                  {formatMoney(data.openingBalance)}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-100 px-3 py-2">
                <p className="text-xs font-semibold text-neutral-500">
                  Saldo final
                </p>
                <p
                  className="text-base font-bold tabular-nums"
                  aria-label="Valor do saldo final"
                >
                  {formatMoney(data.closingBalance)}
                </p>
              </div>
            </div>

            {data.entries.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum movimento no período.
              </p>
            ) : (
              <ul
                aria-label="Movimentos"
                className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
              >
                {data.entries.map((entry) => {
                  const saida = entry.direction === FinancialEntryDirection.OUT;
                  return (
                    <li key={entry.id} className="px-3 py-2 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-900">
                          {FINANCIAL_ENTRY_KIND_LABELS[entry.kind]}
                          {entry.description ? ` · ${entry.description}` : ""}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatarDataHora(entry.occurredAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            saida ? "text-red-600" : "text-teal-700",
                          )}
                        >
                          {saida ? "− " : "+ "}
                          {formatMoney(entry.amount)}
                        </p>
                        <p className="text-xs text-neutral-500 tabular-nums">
                          Saldo {formatMoney(entry.balance)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </div>
      <ModalFooter align="end">
        <button type="button" onClick={onClose} className="ds-btn-outline">
          Fechar
        </button>
        {account && (
          <ExportCsvButton
            className="ds-btn-outline inline-flex items-center justify-center gap-1.5"
            disabled={!!erro}
            filename={`extrato-${periodo.from}_${periodo.to}.csv`}
            onExport={() =>
              financeService.exportAccountStatementCsv(account.id, periodo)
            }
          />
        )}
      </ModalFooter>
    </Modal>
  );
}
