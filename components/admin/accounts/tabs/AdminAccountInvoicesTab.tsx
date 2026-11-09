"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminInvoicesTable } from "@/components/admin/billing/AdminInvoicesTable";
import { adminService } from "@/services/admin.service";
import { adminKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

export function AdminAccountInvoicesTab({ ownerId }: { ownerId: string }) {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountInvoices(ownerId, offset),
    queryFn: () =>
      adminService.listAccountInvoices(ownerId, { limit: PAGE_SIZE, offset }),
  });

  return (
    <div className="space-y-4">
      <AdminInvoicesTable
        invoices={data?.items}
        isLoading={isLoading}
        isError={isError}
        showAccount={false}
      />
      {data && data.total > PAGE_SIZE && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 md:text-sm">
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
    </div>
  );
}
