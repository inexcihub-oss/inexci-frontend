"use client";

import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SelectSearch } from "@/components/ui/SelectSearch";
import { FinanceStatusBadge } from "@/components/finance/FinanceStatusBadge";
import {
  ReceivableDrawer,
  type ReceivableDrawerProps,
} from "@/components/finance/receivables/ReceivableDrawer";
import { NewReceivableModal } from "@/components/finance/receivables/NewReceivableModal";
import { FinanceFilters, periodSummary } from "@/components/finance/FinanceFilters";
import { Pagination } from "@/components/finance/receivables/Pagination";
import { formatDateOnly } from "@/components/finance/receivables/format";
import { useFinanceProfessionals } from "@/hooks/useFinanceProfessionals";
import { financeService } from "@/services/finance.service";
import { patientService } from "@/services/patient.service";
import { financeKeys } from "@/lib/query-keys";
import { formatMoney } from "@/lib/currency";
import {
  RECEIVABLE_STATUS_LABELS,
  ReceivableStatus,
  type ReceivableListParams,
} from "@/types/finance.types";

const LIMITE = 20;

const STATUS_OPCOES = [
  { value: "", label: "Todos" },
  ...Object.values(ReceivableStatus).map((s) => ({
    value: s,
    label: RECEIVABLE_STATUS_LABELS[s],
  })),
];

interface ReceivablesTabProps {
  renderPaymentActions?: ReceivableDrawerProps["renderPaymentActions"];
}

export function ReceivablesTab({ renderPaymentActions }: ReceivablesTabProps) {
  const [filtros, setFiltros] = useState<ReceivableListParams>({});
  const [pagina, setPagina] = useState(1);
  const [pacienteLabel, setPacienteLabel] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const { data: doctors = [] } = useFinanceProfessionals();

  const params: ReceivableListParams = { ...filtros, page: pagina, limit: LIMITE };
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: financeKeys.receivableList(params),
    queryFn: () => financeService.listReceivables(params),
    placeholderData: keepPreviousData,
  });

  const filtrar = (patch: Partial<ReceivableListParams>) => {
    setFiltros((f) => ({ ...f, ...patch }));
    setPagina(1);
  };

  const searchPatients = useCallback(async (term: string) => {
    const { records } = await patientService.list({ search: term, take: 20 });
    return records.map((p) => ({ value: p.id, label: p.name }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">Total em aberto</p>
          <p
            data-testid="total-em-aberto"
            className="text-xl font-bold text-neutral-900"
          >
            {formatMoney(data?.totalOpenAmount ?? "0")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNova(true)}
          className="ds-btn-primary inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova cobrança
        </button>
      </div>

      <FinanceFilters
        activeCount={
          [
            filtros.status,
            filtros.from,
            filtros.to,
            filtros.patientId,
            filtros.executedById,
          ].filter(Boolean).length
        }
        summary={periodSummary(filtros.from, filtros.to)}
        onClear={() => {
          setPacienteLabel("");
          setFiltros({});
          setPagina(1);
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Select
            label="Status"
            options={STATUS_OPCOES}
            value={filtros.status ?? ""}
            onChange={(e) =>
              filtrar({
                status: (e.target.value || undefined) as
                  | ReceivableStatus
                  | undefined,
              })
            }
          />
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
          <SelectSearch
            label="Paciente"
            value={filtros.patientId ?? ""}
            initialLabel={pacienteLabel}
            onChange={(value, label) => {
              setPacienteLabel(label ?? "");
              filtrar({ patientId: value || undefined });
            }}
            onSearch={searchPatients}
            placeholder="Todos"
            ariaLabel="Filtrar por paciente"
          />
          <Select
            label="Profissional"
            options={[
              { value: "", label: "Todos" },
              ...doctors.map((d) => ({ value: d.id, label: d.name })),
            ]}
            value={filtros.executedById ?? ""}
            onChange={(e) =>
              filtrar({ executedById: e.target.value || undefined })
            }
          />
        </div>
      </FinanceFilters>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-red-600">
            Não foi possível carregar as cobranças.
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
          title="Nenhuma cobrança"
          description="As cobranças criadas pela agenda ou avulsas aparecem aqui."
        />
      ) : (
        <>
          <ul
            aria-label="Cobranças"
            className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
          >
            {data.data.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setAberta(r.id)}
                  className="w-full text-left px-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-neutral-50 min-h-[44px]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {r.patient.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {formatDateOnly(r.referenceDate)}
                      {r.description && ` · ${r.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-900">
                        {formatMoney(r.totalAmount)}
                      </p>
                      {r.status !== ReceivableStatus.CANCELLED &&
                        r.status !== ReceivableStatus.PAID && (
                          <p className="text-xs text-neutral-500">
                            Saldo {formatMoney(r.balance)}
                          </p>
                        )}
                    </div>
                    <FinanceStatusBadge status={r.status} />
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

      <NewReceivableModal
        isOpen={nova}
        onClose={() => setNova(false)}
        onCreated={(criada) => setAberta(criada.id)}
      />
      <ReceivableDrawer
        receivableId={aberta}
        isOpen={!!aberta}
        onClose={() => setAberta(null)}
        renderPaymentActions={renderPaymentActions}
      />
    </div>
  );
}
