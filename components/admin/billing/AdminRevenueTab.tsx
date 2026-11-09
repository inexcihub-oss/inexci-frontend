"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarRange,
  CreditCard,
  ReceiptText,
  Repeat,
  Wallet,
} from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { MoneyBarChart } from "@/components/admin/billing/MoneyBarChart";
import { formatBrlCents, pluralize } from "@/lib/admin-format";
import { adminService } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

export function AdminRevenueTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.revenueSummary(),
    queryFn: () => adminService.getRevenueSummary(),
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
        title="Não foi possível carregar a receita"
        description="Tente novamente em instantes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <AdminStatGrid columns={5}>
        <AdminStatCard
          icon={Wallet}
          accent="emerald"
          label="Recebido no mês"
          value={formatBrlCents(data.receivedCents)}
          footnote={pluralize(
            data.receivedInvoices,
            "fatura paga",
            "faturas pagas",
          )}
        />
        <AdminStatCard
          icon={Repeat}
          accent="teal"
          label="Receita recorrente mensal (MRR)"
          value={formatBrlCents(data.mrrCents)}
          hint="Quanto as assinaturas ativas pagam por mês"
        />
        <AdminStatCard
          icon={CalendarRange}
          accent="blue"
          label="Receita recorrente anual (ARR)"
          value={formatBrlCents(data.arrCents)}
          hint="MRR projetado para 12 meses"
        />
        <AdminStatCard
          icon={CreditCard}
          accent="violet"
          label="Ticket médio"
          value={formatBrlCents(data.averageTicketCents)}
          hint="MRR dividido pelas contas pagantes"
          footnote={pluralize(
            data.payingAccounts,
            "conta pagante",
            "contas pagantes",
          )}
        />
        <AdminStatCard
          icon={ReceiptText}
          accent="amber"
          label="Em aberto"
          value={formatBrlCents(data.openCents)}
          footnote={pluralize(data.openInvoices, "fatura", "faturas")}
        />
      </AdminStatGrid>
      <section
        aria-label="Recebido nos últimos 12 meses"
        className="rounded-2xl border border-gray-200"
      >
        <div className="flex h-11 items-center border-b border-neutral-100 px-4">
          <h2 className="text-sm font-semibold">
            Recebido nos últimos 12 meses
          </h2>
        </div>
        <div className="p-4">
          <MoneyBarChart
            series={[{ key: "received", label: "Recebido", color: "#147471" }]}
            data={data.receivedByMonth.map((m) => ({
              month: m.month,
              values: { received: m.receivedCents },
            }))}
          />
        </div>
      </section>
    </div>
  );
}
