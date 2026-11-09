"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Hourglass, ShieldCheck } from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { MoneyBarChart } from "@/components/admin/billing/MoneyBarChart";
import {
  formatBrlCents,
  formatMonthLabel,
  formatSpDate,
} from "@/lib/admin-format";
import { adminService, type AdminForecastItem } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

const MONTHS = 6;

const COLUMNS: AdminColumn<AdminForecastItem>[] = [
  {
    key: "conta",
    header: "Conta",
    mobile: "title",
    cell: (item) => (
      <>
        <Link
          href={`/admin/clientes/${item.ownerId}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {item.name}
        </Link>
        <p className="text-xs font-normal text-gray-500">{item.email}</p>
      </>
    ),
  },
  {
    key: "natureza",
    header: "Natureza",
    cell: (item) => (item.kind === "guaranteed" ? "Garantido" : "Se converter"),
  },
  {
    key: "cobranca",
    header: "Cobrança",
    cell: (item) => formatSpDate(item.chargeAt),
  },
  {
    key: "origem",
    header: "Origem",
    cell: (item) =>
      item.source === "preview" ? "Prévia da Stripe" : "Projeção",
  },
  {
    key: "valor",
    header: "Valor",
    className: "text-right font-medium",
    headClassName: "text-right",
    cell: (item) => formatBrlCents(item.amountCents),
  },
];

export function AdminForecastTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.revenueForecast(MONTHS),
    queryFn: () => adminService.getRevenueForecast(MONTHS),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <EmptyState
        title="Não foi possível carregar a previsão"
        description="Tente novamente em instantes."
      />
    );
  }

  return (
    <div className="space-y-4">
      {data.partial && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          Parte da previsão é estimada: a Stripe não respondeu para algumas
          contas.
        </p>
      )}
      <AdminStatGrid columns={2}>
        <AdminStatCard
          icon={ShieldCheck}
          accent="emerald"
          label="Garantido nos próximos meses"
          value={formatBrlCents(data.totalGuaranteedCents)}
          footnote="Assinaturas ativas"
        />
        <AdminStatCard
          icon={Hourglass}
          accent="amber"
          label="Se os trials converterem"
          value={formatBrlCents(data.totalTrialConversionCents)}
          footnote="Trials com cartão cadastrado"
        />
      </AdminStatGrid>
      <section
        aria-label="Previsão por mês"
        className="rounded-2xl border border-gray-200"
      >
        <div className="flex h-11 items-center border-b border-neutral-100 px-4">
          <h2 className="text-sm font-semibold">Previsão por mês</h2>
        </div>
        <div className="p-4">
          <MoneyBarChart
            series={[
              { key: "guaranteed", label: "Garantido", color: "#147471" },
              {
                key: "trial",
                label: "Se os trials converterem",
                color: "#e0b341",
              },
            ]}
            data={data.months.map((m) => ({
              month: m.month,
              values: {
                guaranteed: m.guaranteedCents,
                trial: m.trialConversionCents,
              },
            }))}
          />
        </div>
      </section>
      {data.months.map((m) => (
        <section
          key={m.month}
          aria-label={`Cobranças de ${formatMonthLabel(m.month)}`}
          className="rounded-2xl border border-gray-200"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-semibold">
              {formatMonthLabel(m.month)}
            </h2>
            <p className="text-xs text-gray-600">
              Garantido {formatBrlCents(m.guaranteedCents)} · Se os trials
              converterem {formatBrlCents(m.trialConversionCents)}
            </p>
          </div>
          {m.items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">
              Nenhuma cobrança prevista.
            </p>
          ) : (
            <AdminDataTable
              rows={m.items}
              columns={COLUMNS}
              rowKey={(item) =>
                `${item.ownerId}-${item.chargeAt}-${item.kind}-${item.source}-${item.amountCents}`
              }
            />
          )}
        </section>
      ))}
    </div>
  );
}
