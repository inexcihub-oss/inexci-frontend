"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import {
  AdminPeriodFilter,
  useAdminPeriod,
} from "@/components/admin/AdminPeriodFilter";
import { AdminInvoicesTable } from "@/components/admin/billing/AdminInvoicesTable";
import { INVOICE_STATUS_OPTIONS } from "@/lib/admin-revenue";
import {
  adminService,
  type AdminInvoiceStatus,
} from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

export function AdminInvoicesTab() {
  const periodState = useAdminPeriod("90d", ["30d", "90d", "month", "custom"]);
  const [status, setStatus] = useState<AdminInvoiceStatus | "">("");
  const [offset, setOffset] = useState(0);
  const { range } = periodState;

  useEffect(() => {
    setOffset(0);
  }, [status, range?.from, range?.to]);

  const params = {
    status: status || undefined,
    from: range?.from,
    to: range?.to,
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.invoices(params),
    queryFn: () => adminService.listInvoices(params),
    enabled: range !== null,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <AdminPeriodFilter state={periodState} />
        <div className="w-full sm:w-48">
          <Select
            aria-label="Status da fatura"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as AdminInvoiceStatus | "")
            }
            options={INVOICE_STATUS_OPTIONS}
          />
        </div>
      </div>
      {range === null ? (
        <EmptyState
          title="Informe o intervalo"
          description="Escolha as datas inicial e final."
        />
      ) : (
        <>
          <AdminInvoicesTable
            invoices={data?.items}
            isLoading={isLoading}
            isError={isError}
          />
          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-2 text-xs text-gray-600 md:text-sm">
              <span>
                {offset + 1}–{Math.min(offset + PAGE_SIZE, data.total)} de{" "}
                {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="ds-btn-inline"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="ds-btn-inline"
                  disabled={offset + PAGE_SIZE >= data.total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
