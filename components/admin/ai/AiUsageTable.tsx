import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatUsdCents } from "@/lib/admin-format";
import { formatVariation } from "@/lib/admin-ai";
import type { AdminAiUsageRow } from "@/services/admin.service";
import { cn } from "@/lib/utils";

export type AiTableKind = "owner" | "user" | "model";

const NAME_HEAD: Record<AiTableKind, string> = {
  owner: "Conta",
  user: "Usuário",
  model: "Modelo",
};

const UNASSIGNED_LABEL: Partial<Record<AiTableKind, [string, string]>> = {
  owner: ["none", "Sem conta"],
  user: ["anonymous", "Sem usuário"],
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

const VARIATION_COLOR = {
  up: "text-red-600",
  down: "text-emerald-600",
  neutral: "text-gray-500",
};

export function AiUsageTable({
  kind,
  rows,
  isLoading,
  isError,
  recordsPlural,
  recordsSingular,
  previous,
}: {
  kind: AiTableKind;
  rows: AdminAiUsageRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
  recordsPlural: string;
  recordsSingular: string;
  previous?: Map<string, number>;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !rows) {
    return (
      <EmptyState
        title="Não foi possível carregar o uso de IA"
        description="Tente novamente em instantes."
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sem uso de IA no período"
        description="Ajuste o período ou a origem."
      />
    );
  }

  const sorted = [...rows].sort(
    (a, b) => (b.costUsdCents ?? 0) - (a.costUsdCents ?? 0),
  );

  const nameCell = (row: AdminAiUsageRow) => {
    if (kind === "model") {
      return <span className="font-medium text-gray-900">{row.groupKey}</span>;
    }
    const unassigned = UNASSIGNED_LABEL[kind];
    if (unassigned && row.groupKey === unassigned[0]) {
      return <span className="font-medium text-gray-500">{unassigned[1]}</span>;
    }
    return (
      <>
        {kind === "owner" ? (
          <Link
            href={`/admin/clientes/${row.groupKey}`}
            className="font-medium text-gray-900 hover:underline"
          >
            {row.name ?? row.email ?? row.groupKey}
          </Link>
        ) : (
          <span className="font-medium text-gray-900">
            {row.name ?? row.email ?? row.groupKey}
          </span>
        )}
        {row.email && (
          <p className="text-xs font-normal text-gray-500">{row.email}</p>
        )}
      </>
    );
  };

  const columns: AdminColumn<AdminAiUsageRow>[] = [
    { key: "nome", header: NAME_HEAD[kind], mobile: "title", cell: nameCell },
    {
      key: "tokens",
      header: "Tokens",
      headClassName: "text-right",
      className: "text-right",
      cell: (row) => fmt(row.totalTokens),
    },
    {
      key: "registros",
      header: recordsPlural,
      headClassName: "text-right",
      className: "text-right",
      cell: (row) => fmt(row.totalRecords),
    },
    {
      key: "custo",
      header: "Custo",
      mobile: "badge",
      headClassName: "text-right",
      className: "text-right font-medium",
      cell: (row) => (
        <span className="text-sm font-semibold text-gray-900">
          {formatUsdCents(row.costUsdCents ?? 0)}
        </span>
      ),
    },
    {
      key: "medio",
      header: `Custo médio por ${recordsSingular}`,
      mobileLabel: `Médio por ${recordsSingular}`,
      headClassName: "text-right",
      className: "text-right",
      cell: (row) =>
        row.totalRecords > 0
          ? formatUsdCents(
              Math.round((row.costUsdCents ?? 0) / row.totalRecords),
            )
          : "—",
    },
    ...(previous
      ? [
          {
            key: "variacao",
            header: "vs. período anterior",
            headClassName: "text-right",
            className: "text-right",
            cell: (row: AdminAiUsageRow) => {
              const variation = formatVariation(
                row.costUsdCents ?? 0,
                previous.get(row.groupKey),
              );
              return (
                <span
                  className={cn(
                    "font-medium",
                    VARIATION_COLOR[variation.direction],
                  )}
                >
                  {variation.label}
                </span>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <AdminDataTable
      rows={sorted}
      columns={columns}
      rowKey={(r) => r.groupKey}
    />
  );
}
