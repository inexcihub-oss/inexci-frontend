import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import { formatBrlCents, formatSpDate } from "@/lib/admin-format";
import { INVOICE_STATUS_META } from "@/lib/admin-revenue";
import type { AdminInvoice } from "@/services/admin.service";
import { cn } from "@/lib/utils";

export function AdminInvoicesTable({
  invoices,
  isLoading,
  isError,
  showAccount = true,
}: {
  invoices: AdminInvoice[] | undefined;
  isLoading: boolean;
  isError: boolean;
  showAccount?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loading size="lg" />
      </div>
    );
  }
  if (isError || !invoices) {
    return (
      <EmptyState
        title="Não foi possível carregar as faturas"
        description="Tente novamente em instantes."
      />
    );
  }
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="Nenhuma fatura encontrada"
        description="Ajuste os filtros ou rode o backfill da Stripe."
      />
    );
  }

  const columns: AdminColumn<AdminInvoice>[] = [
    {
      key: "status",
      header: "Status",
      mobile: "badge",
      cell: (inv) => {
        const meta = INVOICE_STATUS_META[inv.status];
        return (
          <span className={cn("ds-badge-md whitespace-nowrap", meta.className)}>
            {meta.label}
          </span>
        );
      },
    },
    ...(showAccount
      ? [
          {
            key: "conta",
            header: "Conta",
            mobile: "title" as const,
            cell: (inv: AdminInvoice) => (
              <>
                {inv.ownerId ? (
                  <Link
                    href={`/admin/clientes/${inv.ownerId}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {inv.ownerName ?? inv.ownerEmail ?? inv.ownerId}
                  </Link>
                ) : (
                  <span className="text-gray-500">Sem conta vinculada</span>
                )}
                {inv.ownerEmail && (
                  <p className="text-xs font-normal text-gray-500">
                    {inv.ownerEmail}
                  </p>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      key: "valor",
      header: "Valor",
      mobile: showAccount ? "field" : "title",
      className: "text-right font-medium",
      headClassName: "text-right",
      cell: (inv) => (
        <>
          {formatBrlCents(inv.amountDueCents)}
          {inv.amountDiscountCents > 0 && (
            <p className="text-xs font-normal text-gray-500">
              desconto {formatBrlCents(inv.amountDiscountCents)}
            </p>
          )}
        </>
      ),
    },
    { key: "cupom", header: "Cupom", cell: (inv) => inv.couponCode ?? "—" },
    {
      key: "vencimento",
      header: "Vencimento",
      cell: (inv) => formatSpDate(inv.dueDate),
    },
    {
      key: "pagamento",
      header: "Pagamento",
      cell: (inv) => formatSpDate(inv.paidAt),
    },
    {
      key: "fatura",
      header: "Fatura",
      mobile: "full",
      cell: (inv) =>
        inv.hostedInvoiceUrl ? (
          <a
            href={inv.hostedInvoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-btn-inline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ver fatura
          </a>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <AdminDataTable
      rows={invoices}
      columns={columns}
      rowKey={(inv) => inv.id}
      className="max-sm:p-0"
    />
  );
}
