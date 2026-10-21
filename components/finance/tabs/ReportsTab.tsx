"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SectionCard, SectionCardBody } from "@/components/shared/SectionCard";
import { FinanceFilters, periodSummary } from "@/components/finance/FinanceFilters";
import { PeriodFilter } from "@/components/finance/reports/PeriodFilter";
import {
  ReportTable,
  type ReportColumn,
} from "@/components/finance/reports/ReportTable";
import { ExportCsvButton } from "@/components/finance/reports/ExportCsvButton";
import { MonthlyNetChart } from "@/components/finance/reports/MonthlyNetChart";
import { formatarDataIso } from "@/components/finance/reports/download";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { todayISODate } from "@/lib/calendar-date";
import { centsToDecimal, decimalToCents, formatMoney } from "@/lib/currency";
import { erroDoPeriodo, primeiroDiaDoMes } from "@/lib/schemas/finance-reports";
import type {
  OpenReportRow,
  ProductionReportRow,
  ReceiptsGroupBy,
  ReceiptsReportDto,
  ReceiptsReportRow,
} from "@/types/finance.types";

const RECEIPT_COLUMNS: ReportColumn<ReceiptsReportRow>[] = [
  { header: "Descrição", render: (r) => r.label },
  { header: "Pagamentos", render: (r) => r.count, align: "right" },
  { header: "Recebido", render: (r) => formatMoney(r.received), align: "right" },
  { header: "Estornado", render: (r) => formatMoney(r.refunded), align: "right" },
  { header: "Líquido", render: (r) => formatMoney(r.net), align: "right" },
];

const PRODUCTION_COLUMNS: ReportColumn<ProductionReportRow>[] = [
  { header: "Profissional", render: (r) => r.name },
  { header: "Itens", render: (r) => r.items, align: "right" },
  { header: "Faturado", render: (r) => formatMoney(r.billed), align: "right" },
  { header: "Recebido", render: (r) => formatMoney(r.received), align: "right" },
];

const OPEN_COLUMNS: ReportColumn<OpenReportRow>[] = [
  { header: "Paciente", render: (r) => r.patient.name },
  { header: "Referência", render: (r) => formatarDataIso(r.referenceDate) },
  { header: "Vencimento", render: (r) => formatarDataIso(r.dueDate) },
  { header: "Total", render: (r) => formatMoney(r.totalAmount), align: "right" },
  { header: "Pago", render: (r) => formatMoney(r.paidAmount), align: "right" },
  { header: "Saldo", render: (r) => formatMoney(r.balance), align: "right" },
  { header: "Dias", render: (r) => r.ageDays, align: "right" },
];

const RECEIPT_TABLES: Array<{
  groupBy: "method" | "account" | "user";
  title: string;
}> = [
  { groupBy: "method", title: "Por forma de pagamento" },
  { groupBy: "account", title: "Por conta" },
  { groupBy: "user", title: "Por usuário" },
];

function receiptFooter(report?: ReceiptsReportDto) {
  if (!report) return undefined;
  return [
    "Total",
    report.totals.count,
    formatMoney(report.totals.received),
    formatMoney(report.totals.refunded),
    formatMoney(report.totals.net),
  ];
}

function useReceipts(
  groupBy: ReceiptsGroupBy,
  periodo: { from: string; to: string },
  enabled: boolean,
) {
  const params = { ...periodo, groupBy };
  return useQuery({
    queryKey: financeKeys.receiptsReport(params),
    queryFn: () => financeService.getReceiptsReport(params),
    enabled,
  });
}

function TotalCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-100 px-4 py-3">
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p
        className="text-lg font-bold tabular-nums text-neutral-900"
        aria-label={`Total: ${label}`}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function ReportsTab() {
  const [periodo, setPeriodo] = useState(() => {
    const hoje = todayISODate();
    return { from: primeiroDiaDoMes(hoje), to: hoje };
  });
  const erro = erroDoPeriodo(periodo);
  const valido = !erro;
  const sufixo = `${periodo.from}_${periodo.to}`;

  const porForma = useReceipts("method", periodo, valido);
  const porConta = useReceipts("account", periodo, valido);
  const porUsuario = useReceipts("user", periodo, valido);
  const porMes = useReceipts("month", periodo, valido);
  const receiptsByGroup = {
    method: porForma,
    account: porConta,
    user: porUsuario,
  } as const;

  const producao = useQuery({
    queryKey: financeKeys.productionReport(periodo),
    queryFn: () => financeService.getProductionReport(periodo),
    enabled: valido,
  });

  const emAberto = useQuery({
    queryKey: financeKeys.openReport({ until: periodo.to }),
    queryFn: () => financeService.getOpenReport({ until: periodo.to }),
    enabled: valido,
  });

  const totais = porForma.data?.totals;
  const liquidoCentavos = decimalToCents(totais?.net);
  const ticketMedio =
    totais && totais.count > 0
      ? centsToDecimal(Math.round(liquidoCentavos / totais.count))
      : "0.00";

  return (
    <div className="flex flex-col gap-4">
      <FinanceFilters
        summary={periodSummary(periodo.from, periodo.to)}
        error={erro}
      >
        <PeriodFilter
          idPrefix="relatorio"
          from={periodo.from}
          to={periodo.to}
          onChange={setPeriodo}
          error={erro}
        />
      </FinanceFilters>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalCard
          label="Recebido líquido"
          value={formatMoney(totais?.net)}
          hint={totais ? `${totais.count} pagamento(s)` : undefined}
        />
        <TotalCard
          label="Em aberto"
          value={formatMoney(emAberto.data?.totals.balance)}
          hint={
            emAberto.data
              ? `${emAberto.data.totals.count} cobrança(s)`
              : undefined
          }
        />
        <TotalCard label="Ticket médio" value={formatMoney(ticketMedio)} />
      </div>

      <SectionCard title="Recebido por mês">
        <SectionCardBody>
          {porMes.isLoading ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : (
            <MonthlyNetChart rows={porMes.data?.rows ?? []} />
          )}
        </SectionCardBody>
      </SectionCard>

      {RECEIPT_TABLES.map(({ groupBy, title }) => {
        const query = receiptsByGroup[groupBy];
        return (
          <ReportTable
            key={groupBy}
            title={title}
            columns={RECEIPT_COLUMNS}
            rows={query.data?.rows ?? []}
            rowKey={(r) => r.key}
            footer={receiptFooter(query.data)}
            isLoading={query.isLoading && valido}
            isError={query.isError}
            action={
              <ExportCsvButton
                ariaLabel={`Exportar CSV ${title.toLowerCase()}`}
                disabled={!valido}
                filename={`recebimentos-${groupBy}-${sufixo}.csv`}
                onExport={() =>
                  financeService.exportReceiptsReportCsv({ ...periodo, groupBy })
                }
              />
            }
          />
        );
      })}

      <ReportTable
        title="Por profissional"
        columns={PRODUCTION_COLUMNS}
        rows={producao.data?.rows ?? []}
        rowKey={(r, i) => r.executedById ?? `sem-profissional-${i}`}
        footer={
          producao.data
            ? [
                "Total",
                producao.data.totals.items,
                formatMoney(producao.data.totals.billed),
                formatMoney(producao.data.totals.received),
              ]
            : undefined
        }
        isLoading={producao.isLoading && valido}
        isError={producao.isError}
        action={
          <ExportCsvButton
            ariaLabel="Exportar CSV por profissional"
            disabled={!valido}
            filename={`producao-${sufixo}.csv`}
            onExport={() => financeService.exportProductionReportCsv(periodo)}
          />
        }
      />

      <ReportTable
        title="Em aberto"
        columns={OPEN_COLUMNS}
        rows={emAberto.data?.rows ?? []}
        rowKey={(r) => r.receivableId}
        emptyText="Nenhuma cobrança em aberto."
        footer={
          emAberto.data
            ? [
                `${emAberto.data.totals.count} cobrança(s)`,
                "",
                "",
                "",
                "",
                formatMoney(emAberto.data.totals.balance),
                "",
              ]
            : undefined
        }
        isLoading={emAberto.isLoading && valido}
        isError={emAberto.isError}
        action={
          <ExportCsvButton
            ariaLabel="Exportar CSV em aberto"
            disabled={!valido}
            filename={`em-aberto-${periodo.to}.csv`}
            onExport={() =>
              financeService.exportOpenReportCsv({ until: periodo.to })
            }
          />
        }
      />
    </div>
  );
}
