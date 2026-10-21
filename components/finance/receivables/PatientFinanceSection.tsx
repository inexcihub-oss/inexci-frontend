"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FinanceStatusBadge } from "@/components/finance/FinanceStatusBadge";
import {
  ReceivableDrawer,
  type ReceivableDrawerProps,
} from "@/components/finance/receivables/ReceivableDrawer";
import { NewReceivableModal } from "@/components/finance/receivables/NewReceivableModal";
import { formatDateOnly } from "@/components/finance/receivables/format";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { formatMoney } from "@/lib/currency";

interface PatientFinanceSectionProps {
  patient: { id: string; name: string };
  renderPaymentActions?: ReceivableDrawerProps["renderPaymentActions"];
}

export function PatientFinanceSection({
  patient,
  renderPaymentActions,
}: PatientFinanceSectionProps) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: financeKeys.patientSummary(patient.id),
    queryFn: () => financeService.getPatientSummary(patient.id),
  });

  return (
    <section aria-label="Financeiro do paciente" className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500">Em aberto</p>
          <p data-testid="paciente-em-aberto" className="text-xl font-bold text-neutral-900">
            {formatMoney(data?.openAmount ?? "0")}
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

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-red-600">
            Não foi possível carregar o financeiro do paciente.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
          >
            Tentar novamente
          </button>
        </div>
      ) : !data || data.receivables.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          Nenhuma cobrança para este paciente.
        </p>
      ) : (
        <ul
          aria-label="Histórico de cobranças"
          className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl"
        >
          {data.receivables.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setAberta(r.id)}
                className="w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-neutral-50 min-h-[44px]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {r.description || "Cobrança"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDateOnly(r.referenceDate)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-neutral-900 shrink-0">
                  {formatMoney(r.totalAmount)}
                </span>
                <FinanceStatusBadge status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <NewReceivableModal
        isOpen={nova}
        onClose={() => setNova(false)}
        defaultPatient={patient}
        onCreated={(criada) => setAberta(criada.id)}
      />
      <ReceivableDrawer
        receivableId={aberta}
        isOpen={!!aberta}
        onClose={() => setAberta(null)}
        renderPaymentActions={renderPaymentActions}
      />
    </section>
  );
}
