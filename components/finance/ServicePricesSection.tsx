"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { SectionCard, SectionCardBody } from "@/components/shared/SectionCard";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { ServicePriceModal } from "@/components/finance/ServicePriceModal";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useToast } from "@/hooks/useToast";
import { financeService } from "@/services/finance.service";
import { APPOINTMENT_TYPE_LABELS } from "@/services/appointment.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { ServicePriceDto } from "@/types/finance.types";

type ModalState =
  | { open: false }
  | { open: true; servicePrice: ServicePriceDto | null };

export function ServicePricesSection() {
  const {
    data: prices = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: financeKeys.servicePrices(),
    queryFn: () => financeService.listServicePrices(),
  });
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [excluindo, setExcluindo] = useState<ServicePriceDto | null>(null);
  const { showSuccess, showError } = useToast();

  const excluir = useFinanceMutation(
    (servicePrice: ServicePriceDto) =>
      financeService.deleteServicePrice(servicePrice.id),
    {
      invalidate: [financeKeys.servicePrices()],
      onSuccess: () => {
        showSuccess("Preço excluído.");
        setExcluindo(null);
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível excluir o preço."),
        ),
    },
  );

  return (
    <SectionCard
      title="Tabela de preços"
      headerAction={
        <button
          type="button"
          onClick={() => setModal({ open: true, servicePrice: null })}
          className="ds-btn-inline-primary inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
          Novo preço
        </button>
      }
    >
      <SectionCardBody>
        {isLoading ? (
          <p className="text-sm text-gray-500">Carregando preços...</p>
        ) : isError ? (
          <p className="text-sm text-red-600">
            Não foi possível carregar a tabela de preços.
          </p>
        ) : prices.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum preço cadastrado. O valor cadastrado aqui é sugerido ao
            agendar uma consulta particular.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {prices.map((price) => (
              <li
                key={price.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span className="truncate">{price.description}</span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        price.active
                          ? "bg-teal-50 text-teal-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {price.active ? "Ativo" : "Inativo"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {price.doctor?.name ?? "Todos os profissionais"} ·{" "}
                    {price.appointmentType
                      ? APPOINTMENT_TYPE_LABELS[price.appointmentType]
                      : "Todos os tipos"}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-gray-900">
                  {formatMoney(price.amount)}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModal({ open: true, servicePrice: price })}
                    className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Editar ${price.description}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluindo(price)}
                    className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Excluir ${price.description}`}
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCardBody>
      <ServicePriceModal
        isOpen={modal.open}
        servicePrice={modal.open ? modal.servicePrice : null}
        onClose={() => setModal({ open: false })}
      />
      <ConfirmDeleteModal
        isOpen={!!excluindo}
        title="Excluir preço"
        itemName={excluindo?.description}
        loading={excluir.isPending}
        onConfirm={() => excluindo && excluir.mutate(excluindo)}
        onCancel={() => setExcluindo(null)}
      />
    </SectionCard>
  );
}
