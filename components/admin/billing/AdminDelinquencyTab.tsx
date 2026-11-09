"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ReceiptText, TriangleAlert } from "lucide-react";
import { AdminStatCard, AdminStatGrid } from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatBrlCents, pluralize, formatSpDate } from "@/lib/admin-format";
import { adminService, type AdminDelinquency } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type DelinquencyItem = AdminDelinquency["items"][number];

const COLUMNS: AdminColumn<DelinquencyItem>[] = [
  {
    key: "conta",
    header: "Conta",
    mobile: "title",
    cell: (item) => (
      <>
        <span className="font-medium text-gray-900">{item.name}</span>
        <p className="text-xs font-normal text-gray-500">{item.email}</p>
      </>
    ),
  },
  { key: "plano", header: "Plano", cell: (item) => item.planName },
  {
    key: "situacao",
    header: "Situação",
    mobile: "badge",
    cell: (item) => (
      <span
        className={cn(
          "ds-badge-md whitespace-nowrap",
          item.status === "suspended"
            ? "bg-red-100 text-red-800"
            : "bg-red-50 text-red-700",
        )}
      >
        {item.status === "suspended" ? "Suspensa" : "Inadimplente"}
      </span>
    ),
  },
  {
    key: "aberto",
    header: "Em aberto",
    className: "text-right font-medium",
    headClassName: "text-right",
    cell: (item) => (
      <>
        {formatBrlCents(item.openCents)}
        <p className="text-xs font-normal text-gray-500">
          {pluralize(item.openInvoices, "fatura", "faturas")}
        </p>
      </>
    ),
  },
  {
    key: "atraso",
    header: "Dias de atraso",
    className: "text-right",
    headClassName: "text-right",
    cell: (item) => item.daysOverdue ?? "—",
  },
  {
    key: "suspensao",
    header: "Suspensão",
    cell: (item) =>
      item.suspensionDate
        ? `${item.status === "suspended" ? "Desde" : "Em"} ${formatSpDate(item.suspensionDate)}`
        : "—",
  },
  {
    key: "detalhe",
    header: <span className="sr-only">Detalhe</span>,
    mobileLabel: "Detalhe",
    mobile: "full",
    cell: (item) => (
      <Link href={`/admin/clientes/${item.ownerId}`} className="ds-btn-inline">
        Abrir conta
      </Link>
    ),
  },
];

export function AdminDelinquencyTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.delinquency(),
    queryFn: () => adminService.getDelinquency(),
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
        title="Não foi possível carregar a inadimplência"
        description="Tente novamente em instantes."
      />
    );
  }

  return (
    <div className="space-y-4">
      <AdminStatGrid columns={2}>
        <AdminStatCard
          icon={ReceiptText}
          accent="red"
          label="Total em aberto"
          value={formatBrlCents(data.totalOpenCents)}
        />
        <AdminStatCard
          icon={TriangleAlert}
          accent="amber"
          label="Contas inadimplentes ou suspensas"
          value={data.items.length}
        />
      </AdminStatGrid>
      {data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma conta inadimplente"
          description="Todas as contas estão em dia."
        />
      ) : (
        <AdminDataTable
          rows={data.items}
          columns={COLUMNS}
          rowKey={(item) => item.ownerId}
          className="max-sm:p-0"
        />
      )}
    </div>
  );
}
