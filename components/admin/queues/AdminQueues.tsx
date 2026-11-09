"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import PageContainer from "@/components/PageContainer";
import { AdminPager } from "@/components/admin/AdminPager";
import {
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
} from "@/components/admin/AdminStatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { QUEUE_ICON, parseQueueName } from "@/lib/admin-queues";
import { getApiErrorMessage } from "@/lib/http-error";
import { adminKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import {
  adminService,
  type AdminFailedJob,
  type AdminQueueJobAction,
} from "@/services/admin.service";
import { FailedJobsList } from "./FailedJobsList";
import { QueueJobActionModal } from "./QueueJobActionModal";

export const FAILED_JOBS_PAGE_SIZE = 20;
const UNAVAILABLE = "Não foi possível ler as filas agora.";

export function AdminQueues() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const queue = parseQueueName(searchParams.get("fila"));
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);
  const [pending, setPending] = useState<{
    action: AdminQueueJobAction;
    job: AdminFailedJob;
  } | null>(null);

  const overview = useQuery({
    queryKey: adminKeys.queues(),
    queryFn: () => adminService.getQueuesOverview(),
    refetchInterval: 30_000,
  });

  const params = {
    ...(queue ? { queue } : {}),
    limit: FAILED_JOBS_PAGE_SIZE,
    offset: (page - 1) * FAILED_JOBS_PAGE_SIZE,
  };
  const failed = useQuery({
    queryKey: adminKeys.failedJobs(params),
    queryFn: () => adminService.listFailedJobs(params),
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

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: adminKeys.queues() });

  const pages = failed.data
    ? Math.max(Math.ceil(failed.data.total / FAILED_JOBS_PAGE_SIZE), 1)
    : 1;

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">Filas</h1>
            <p className="text-xs text-neutral-500">
              Tarefas em segundo plano: envios, PDFs, leitura de documentos e
              assistente
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="ds-toolbar-btn"
            disabled={overview.isFetching}
          >
            <RefreshCw
              className={
                overview.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
              aria-hidden="true"
            />
            Atualizar
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-auto p-3 lg:p-6">
          {overview.isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : overview.isError || !overview.data ? (
            <EmptyState
              title={UNAVAILABLE}
              description={getApiErrorMessage(
                overview.error,
                "Tente novamente em instantes.",
              )}
            />
          ) : (
            <>
              <AdminSection
                title="Situação das filas"
                accent="teal"
                description={`Atualizado em ${formatDateTime(overview.data.checkedAt)}`}
              >
                <AdminStatGrid columns={4}>
                  {overview.data.queues.map((q) => (
                    <button
                      key={q.name}
                      type="button"
                      aria-pressed={queue === q.name}
                      onClick={() =>
                        update({
                          fila: queue === q.name ? null : q.name,
                          pagina: null,
                        })
                      }
                      className="h-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <AdminStatCard
                        icon={QUEUE_ICON[q.name]}
                        accent={q.failed > 0 ? "red" : "teal"}
                        label={q.label}
                        value={`${q.failed} ${q.failed === 1 ? "falha" : "falhas"}`}
                        tone={q.failed > 0 ? "danger" : "default"}
                        hint={q.description}
                        badge={
                          q.paused ? (
                            <span className="ds-badge-sm bg-amber-100 text-amber-800">
                              Pausada
                            </span>
                          ) : undefined
                        }
                        footnote={`${q.waiting} aguardando · ${q.active} em execução · ${q.delayed} agendadas`}
                        className={
                          queue === q.name
                            ? "ring-2 ring-primary-500"
                            : undefined
                        }
                      />
                    </button>
                  ))}
                </AdminStatGrid>
              </AdminSection>

              <AdminSection
                title="Tarefas com falha"
                accent="red"
                description={
                  queue
                    ? "Filtrado pela fila escolhida. Toque no card de novo para ver todas."
                    : "Tarefas que falharam em todas as tentativas, das mais recentes para as mais antigas"
                }
              >
                {failed.isLoading ? (
                  <div className="flex justify-center py-10">
                    <Loading size="lg" />
                  </div>
                ) : failed.isError || !failed.data ? (
                  <EmptyState
                    title="Não foi possível carregar as falhas"
                    description={getApiErrorMessage(
                      failed.error,
                      "Tente novamente em instantes.",
                    )}
                  />
                ) : (
                  <>
                    <FailedJobsList
                      items={failed.data.items}
                      onAction={(action, job) => setPending({ action, job })}
                    />
                    <AdminPager
                      page={page}
                      pages={pages}
                      onPageChange={(p) => update({ pagina: String(p) })}
                    />
                  </>
                )}
              </AdminSection>
            </>
          )}
        </div>
      </div>
      {pending && (
        <QueueJobActionModal
          action={pending.action}
          job={pending.job}
          onClose={() => setPending(null)}
        />
      )}
    </PageContainer>
  );
}
