"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ReceivableDrawer,
  type ReceivableDrawerProps,
} from "@/components/finance/receivables/ReceivableDrawer";
import { FinanceFilters, periodSummary } from "@/components/finance/FinanceFilters";
import { Pagination } from "@/components/finance/receivables/Pagination";
import { formatDateTime } from "@/components/finance/receivables/format";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { todayISODate } from "@/lib/calendar-date";
import { decimalToCents, formatMoney } from "@/lib/currency";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  type PaymentListParams,
} from "@/types/finance.types";

const LIMITE = 20;

const FORMAS = [
  { value: "", label: "Todas" },
  ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] })),
];

function inicioDoMes(hoje: string): string {
  return `${hoje.slice(0, 8)}01`;
}

interface PaymentsTabProps {
  renderPaymentActions?: ReceivableDrawerProps["renderPaymentActions"];
}

export function PaymentsTab({ renderPaymentActions }: PaymentsTabProps) {
  const [filtros, setFiltros] = useState<PaymentListParams>(() => {
    const hoje = todayISODate();
    return { from: inicioDoMes(hoje), to: hoje };
  });
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<string | null>(null);

  const params: PaymentListParams = { ...filtros, page: pagina, limit: LIMITE };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: financeKeys.paymentList(params),
    queryFn: () => financeService.listPayments(params),
    placeholderData: keepPreviousData,
  });

  const filtrar = (patch: Partial<PaymentListParams>) => {
    setFiltros((f) => ({ ...f, ...patch }));
    setPagina(1);
  };

  return (
    <div className="flex flex-col gap-4">
      <FinanceFilters
        activeCount={filtros.method ? 1 : 0}
        summary={periodSummary(filtros.from, filtros.to)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            type="date"
            label="De"
            value={filtros.from ?? ""}
            onChange={(e) => filtrar({ from: e.target.value || undefined })}
          />
          <Input
            type="date"
            label="Até"
            value={filtros.to ?? ""}
            onChange={(e) => filtrar({ to: e.target.value || undefined })}
          />
          <Select
            label="Forma"
            options={FORMAS}
            value={filtros.method ?? ""}
            onChange={(e) =>
              filtrar({
                method: (e.target.value || undefined) as PaymentMethod | undefined,
              })
            }
          />
        </div>
      </FinanceFilters>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-neutral-50 px-3 py-2">
          <p className="text-xs text-neutral-500">Total recebido</p>
          <p data-testid="total-recebido" className="text-lg font-bold text-neutral-900">
            {formatMoney(data?.totalAmount ?? "0")}
          </p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-3 py-2">
          <p className="text-xs text-neutral-500">Total estornado</p>
          <p data-testid="total-estornado" className="text-lg font-bold text-red-700">
            {formatMoney(data?.totalRefunded ?? "0")}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-red-600">
            Não foi possível carregar os recebimentos.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
          >
            Tentar novamente
          </button>
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-10 w-10" />}
          title="Nenhum recebimento no período"
          description="Os pagamentos registrados aparecem aqui."
        />
      ) : (
        <>
          <ul
            aria-label="Recebimentos"
            className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
          >
            {data.data.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setAberta(p.receivableId)}
                  className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-neutral-50 min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {p.patient.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {PAYMENT_METHOD_LABELS[p.method]}
                      {p.method === PaymentMethod.CREDIT_CARD &&
                        p.installments &&
                        ` ${p.installments}x`}
                      {" · "}
                      {formatDateTime(p.paidAt)}
                      {p.account && ` · ${p.account.name}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">
                      {formatMoney(p.amount)}
                    </p>
                    {decimalToCents(p.refundedAmount) > 0 && (
                      <p className="text-xs text-red-700">
                        Estornado {formatMoney(p.refundedAmount)}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onChange={setPagina}
          />
        </>
      )}

      <ReceivableDrawer
        receivableId={aberta}
        isOpen={!!aberta}
        onClose={() => setAberta(null)}
        renderPaymentActions={renderPaymentActions}
      />
    </div>
  );
}
