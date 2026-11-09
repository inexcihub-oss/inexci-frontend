"use client";

import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatBrlCents } from "@/lib/admin-format";
import { adminService, type AdminPlan } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

const PERIOD_LABEL = { MONTHLY: "Mensal", YEARLY: "Anual" } as const;

const COLUMNS: AdminColumn<AdminPlan>[] = [
  {
    key: "plano",
    header: "Plano",
    mobile: "title",
    cell: (plan) => (
      <>
        <span className="font-medium text-gray-900">{plan.name}</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {plan.divergent === true && (
            <span className="ds-badge-md whitespace-nowrap bg-red-50 text-red-700">
              Divergente da Stripe
            </span>
          )}
          {plan.gatewayError && (
            <span className="ds-badge-md bg-gray-100 text-gray-600 sm:whitespace-nowrap">
              Não foi possível consultar a Stripe
            </span>
          )}
        </div>
        {plan.divergent === true && plan.gatewayPriceCents !== null && (
          <p className="mt-1 text-xs font-normal text-gray-500">
            Stripe: {formatBrlCents(plan.gatewayPriceCents)}
            {plan.gatewayCycle ? ` · ${PERIOD_LABEL[plan.gatewayCycle]}` : ""}
          </p>
        )}
      </>
    ),
  },
  {
    key: "periodo",
    header: "Período",
    mobile: "subtitle",
    cell: (plan) => PERIOD_LABEL[plan.billingPeriod],
  },
  {
    key: "preco",
    header: "Preço",
    className: "text-right",
    headClassName: "text-right",
    cell: (plan) => formatBrlCents(plan.priceCents),
  },
  {
    key: "cota",
    header: "Cota de SCs",
    className: "text-right",
    headClassName: "text-right",
    cell: (plan) =>
      plan.surgeryRequestQuota < 0 ? "Ilimitada" : plan.surgeryRequestQuota,
  },
  {
    key: "ativo",
    header: "Ativo",
    cell: (plan) => (plan.isActive ? "Sim" : "Não"),
  },
  {
    key: "trial",
    header: "Trial padrão",
    cell: (plan) => (plan.isTrialDefault ? "Sim" : "Não"),
  },
  {
    key: "contas",
    header: "Contas",
    className: "text-right",
    headClassName: "text-right",
    cell: (plan) => plan.accounts,
  },
];

export function AdminPlans() {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.plans(),
    queryFn: () => adminService.listPlans(),
  });

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">Planos</h1>
          <p className="text-xs text-neutral-500">
            Somente leitura, com o preço conferido na Stripe
          </p>
        </header>
        <div className="flex-1 overflow-auto p-3 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar os planos"
              description="Tente novamente em instantes."
            />
          ) : data.length === 0 ? (
            <EmptyState title="Nenhum plano cadastrado" />
          ) : (
            <AdminDataTable
              rows={data}
              columns={COLUMNS}
              rowKey={(plan) => plan.id}
              className="max-sm:p-0"
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
