"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { parseErrorDays, parseErrorSource } from "@/lib/admin-errors";
import { adminKeys } from "@/lib/query-keys";
import {
  adminService,
  type AdminErrorPeriodDays,
  type AdminErrorSource,
} from "@/services/admin.service";
import { ErrorsFilters } from "./ErrorsFilters";
import { ERRORS_PAGE_SIZE, ErrorsReport } from "./ErrorsReport";

export function AdminErrors() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const days = parseErrorDays(searchParams.get("periodo"));
  const source = parseErrorSource(searchParams.get("origem"));
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);

  const params = {
    days,
    ...(source ? { source } : {}),
    limit: ERRORS_PAGE_SIZE,
    offset: (page - 1) * ERRORS_PAGE_SIZE,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.errors(params),
    queryFn: () => adminService.getErrors(params),
    placeholderData: (previous) => previous,
  });

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">Erros</h1>
            <p className="text-xs text-neutral-500">
              Falhas da plataforma por conta, sem dados de pacientes
            </p>
          </div>
          <ErrorsFilters
            days={days}
            source={source}
            onDaysChange={(d: AdminErrorPeriodDays) =>
              update({ periodo: String(d), pagina: null })
            }
            onSourceChange={(s: AdminErrorSource | undefined) =>
              update({ origem: s ?? null, pagina: null })
            }
          />
        </header>
        <div className="flex-1 overflow-auto p-3 lg:p-6">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <EmptyState
              title="Não foi possível carregar os erros"
              description="Tente novamente em instantes."
            />
          ) : (
            <ErrorsReport
              data={data}
              days={days}
              page={page}
              onPageChange={(p) => update({ pagina: String(p) })}
              failedDeliveriesHref="/admin/envios?situacao=failed"
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
