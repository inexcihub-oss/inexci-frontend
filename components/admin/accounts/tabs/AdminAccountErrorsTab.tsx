"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { ErrorsFilters } from "@/components/admin/errors/ErrorsFilters";
import {
  ERRORS_PAGE_SIZE,
  ErrorsReport,
} from "@/components/admin/errors/ErrorsReport";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminErrorPeriodDays,
  type AdminErrorSource,
} from "@/services/admin.service";

export function AdminAccountErrorsTab({ ownerId }: { ownerId: string }) {
  const [days, setDays] = useState<AdminErrorPeriodDays>(30);
  const [source, setSource] = useState<AdminErrorSource | undefined>();
  const [page, setPage] = useState(1);

  const params = {
    days,
    ...(source ? { source } : {}),
    limit: ERRORS_PAGE_SIZE,
    offset: (page - 1) * ERRORS_PAGE_SIZE,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.accountErrors(ownerId, params),
    queryFn: () => adminService.getAccountErrors(ownerId, params),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-4">
      <ErrorsFilters
        days={days}
        source={source}
        onDaysChange={(d) => {
          setDays(d);
          setPage(1);
        }}
        onSourceChange={(s) => {
          setSource(s);
          setPage(1);
        }}
      />
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loading size="lg" />
        </div>
      ) : isError || !data ? (
        <EmptyState title="Não foi possível carregar os erros desta conta" />
      ) : (
        <ErrorsReport
          data={data}
          days={days}
          page={page}
          onPageChange={setPage}
          ownerId={ownerId}
          failedDeliveriesHref={`/admin/envios?conta=${ownerId}&situacao=failed`}
        />
      )}
    </div>
  );
}
