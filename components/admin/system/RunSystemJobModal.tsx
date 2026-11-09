"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { ReasonField } from "@/components/admin/accounts/subscription/ReasonField";
import { useToast } from "@/hooks/useToast";
import { useZodForm } from "@/hooks/useZodForm";
import {
  errorStatus,
  responseMessage,
} from "@/components/admin/auth/admin-auth-errors";
import { jobCountMessage } from "@/lib/admin-system";
import { adminKeys } from "@/lib/query-keys";
import { adminReasonSchema } from "@/lib/schemas/admin.schema";
import { adminService, type SystemJob } from "@/services/admin.service";

export const JOB_RUNNING_MESSAGE =
  "Esta tarefa já está em execução. Aguarde terminar antes de disparar de novo.";

interface Props {
  job: SystemJob;
  onClose: () => void;
}

export function RunSystemJobModal({ job, onClose }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useZodForm({
    schema: adminReasonSchema,
    initialValues: { reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (reason: string) => adminService.runSystemJob(job.key, reason),
    onMutate: () => setServerError(null),
    onSuccess: async (result) => {
      showToast(jobCountMessage(result.key, result.count), "success");
      await queryClient.invalidateQueries({
        queryKey: adminKeys.systemJobs(),
      });
      onClose();
    },
    onError: async (error) => {
      if (errorStatus(error) === 409) {
        showToast(JOB_RUNNING_MESSAGE, "warning");
        await queryClient.invalidateQueries({
          queryKey: adminKeys.systemJobs(),
        });
        onClose();
        return;
      }
      setServerError(
        responseMessage(error, "Não foi possível executar a tarefa."),
      );
    },
  });

  const confirm = form.handleSubmit(({ reason }) => {
    mutation.mutate(reason);
  });

  const reasonField = form.getFieldProps("reason");
  const isWeekly = job.key === "weekly_summary";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Executar agora"
      size="sm"
      disableClose={mutation.isPending}
      footer={
        <ModalFooter align="end">
          <SpinnerButton
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </SpinnerButton>
          <SpinnerButton
            onClick={() => void confirm()}
            isLoading={mutation.isPending}
            loadingText="Executando..."
          >
            Executar agora
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-gray-700">
          Executar <strong>{job.name}</strong> fora da agenda?
        </p>
        {isWeekly ? (
          <div
            role="note"
            className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Isso envia o resumo semanal por e-mail para{" "}
              <strong>todos os usuários elegíveis</strong> agora, além do envio
              agendado. Não dá para desfazer.
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Os avisos de solicitações paradas são enviados na hora para os
            responsáveis.
          </p>
        )}
        <ReasonField
          id="run-job-reason"
          value={reasonField.value}
          onChange={(value) => {
            setServerError(null);
            form.setField("reason", value);
          }}
          error={reasonField.error}
        />
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {serverError}
          </div>
        )}
      </div>
    </Modal>
  );
}
