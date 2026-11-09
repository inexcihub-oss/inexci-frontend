"use client";

import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { attemptsLabel } from "@/lib/admin-queues";
import { formatDateTime } from "@/lib/utils";
import type {
  AdminFailedJob,
  AdminQueueJobAction,
} from "@/services/admin.service";

export function FailedJobsList({
  items,
  onAction,
}: {
  items: AdminFailedJob[];
  onAction: (action: AdminQueueJobAction, job: AdminFailedJob) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa com falha"
        description="Quando uma tarefa falhar em todas as tentativas, ela aparece aqui."
      />
    );
  }
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
      {items.map((job) => (
        <li
          key={`${job.queue}:${job.id}`}
          className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="ds-badge-sm bg-red-50 text-red-700">
                {job.queueLabel}
              </span>
              <span className="min-w-0 break-all font-mono text-xs text-gray-500">
                {job.name} · #{job.id}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">
              {job.error ?? "Falha sem mensagem"}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              {attemptsLabel(job.attemptsMade, job.maxAttempts)}
              {job.failedAt && <> · falhou em {formatDateTime(job.failedAt)}</>}
              {" · "}
              {job.ownerId ? (
                <Link
                  href={`/admin/clientes/${job.ownerId}`}
                  className="font-medium text-primary-700 hover:underline"
                >
                  {job.ownerName ?? "Abrir conta"}
                </Link>
              ) : (
                "sem conta"
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAction("retry", job)}
              className="ds-toolbar-btn"
              aria-label={`Tentar de novo a tarefa ${job.id} de ${job.queueLabel}`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => onAction("discard", job)}
              className="ds-toolbar-btn text-red-700"
              aria-label={`Descartar a tarefa ${job.id} de ${job.queueLabel}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Descartar
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
