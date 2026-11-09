"use client";

import { AdminReasonModal } from "@/components/admin/team/AdminReasonModal";
import {
  adminService,
  type AdminFailedJob,
  type AdminQueueJobAction,
} from "@/services/admin.service";

const COPY: Record<
  AdminQueueJobAction,
  {
    title: string;
    confirm: string;
    loading: string;
    success: string;
    explain: string;
  }
> = {
  retry: {
    title: "Tentar de novo",
    confirm: "Tentar de novo",
    loading: "Enviando...",
    success: "A tarefa voltou para a fila.",
    explain:
      "A tarefa volta para a fila e roda de novo em instantes. Se for um envio, a mensagem pode ser entregue agora.",
  },
  discard: {
    title: "Descartar tarefa",
    confirm: "Descartar",
    loading: "Descartando...",
    success: "Tarefa descartada.",
    explain: "A tarefa sai da fila e não será executada. Não dá para desfazer.",
  },
};

export function QueueJobActionModal({
  action,
  job,
  onClose,
}: {
  action: AdminQueueJobAction;
  job: AdminFailedJob;
  onClose: () => void;
}) {
  const copy = COPY[action];
  return (
    <AdminReasonModal
      isOpen
      onClose={onClose}
      title={copy.title}
      confirmLabel={copy.confirm}
      loadingLabel={copy.loading}
      successMessage={copy.success}
      reasonId={`queue-job-${action}-reason`}
      action={(reason) =>
        adminService.runQueueJobAction(action, job.queue, job.id, reason)
      }
    >
      <p className="text-sm text-gray-700">
        <strong>{job.queueLabel}</strong> · tarefa {job.id}
        {job.ownerName && <> · {job.ownerName}</>}
      </p>
      <p
        className={
          action === "discard"
            ? "rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
            : "rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800"
        }
      >
        {copy.explain}
      </p>
    </AdminReasonModal>
  );
}
