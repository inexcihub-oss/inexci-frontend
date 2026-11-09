"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import { formatDateTimeSP } from "@/lib/admin-audit";
import { formatJobResult } from "@/lib/admin-system";
import { adminKeys } from "@/lib/query-keys";
import { adminService, type SystemJob } from "@/services/admin.service";
import { RunSystemJobModal } from "./RunSystemJobModal";

function LastRun({ job }: { job: SystemJob }) {
  const run = job.lastManualRun;
  if (!run) {
    return (
      <p className="text-xs text-neutral-500">
        Nenhuma execução manual registrada
      </p>
    );
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <dt className="text-neutral-500">Quando</dt>
      <dd className="text-neutral-900">{formatDateTimeSP(run.at)}</dd>
      <dt className="text-neutral-500">Quem</dt>
      <dd className="text-neutral-900">{run.by ?? "—"}</dd>
      <dt className="text-neutral-500">Resultado</dt>
      <dd className="text-neutral-900">
        {formatJobResult(job.key, run.result)}
      </dd>
    </dl>
  );
}

export function SystemJobsSection() {
  const [running, setRunning] = useState<SystemJob | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.systemJobs(),
    queryFn: () => adminService.listSystemJobs(),
  });

  const jobs = data ?? [];

  return (
    <section aria-labelledby="system-jobs-title" className="space-y-3">
      <div>
        <h2 id="system-jobs-title" className="ds-section-title">
          Tarefas automáticas
        </h2>
        <p className="text-xs text-neutral-500">
          Rotinas agendadas da plataforma. Executar manualmente fica registrado
          no histórico de ações.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loading size="md" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar as tarefas"
          description="Tente novamente em instantes."
        />
      ) : jobs.length === 0 ? (
        <EmptyState title="Nenhuma tarefa automática" />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <Card
              key={job.key}
              data-testid={`job-card-${job.key}`}
              className="rounded-2xl border border-gray-200"
            >
              <CardContent className="flex h-full flex-col gap-3 p-3.5 sm:p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {job.name}
                  </h3>
                  <p className="text-xs text-neutral-600">{job.description}</p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                    {job.schedule}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Última execução manual
                  </p>
                  <LastRun job={job} />
                </div>
                <div className="mt-auto flex justify-end">
                  <button
                    type="button"
                    className="ds-btn-primary inline-flex items-center gap-1.5"
                    onClick={() => setRunning(job)}
                    aria-label={`Executar agora: ${job.name}`}
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Executar agora
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {running && (
        <RunSystemJobModal job={running} onClose={() => setRunning(null)} />
      )}
    </section>
  );
}
