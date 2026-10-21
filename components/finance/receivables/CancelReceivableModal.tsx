"use client";

import { useEffect } from "react";
import Textarea from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { cancelReceivableSchema } from "@/lib/schemas/finance";

interface CancelReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivableId: string;
}

export function CancelReceivableModal({
  isOpen,
  onClose,
  receivableId,
}: CancelReceivableModalProps) {
  const { showSuccess, showError } = useToast();
  const form = useZodForm({
    schema: cancelReceivableSchema,
    initialValues: { reason: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const cancelar = useFinanceMutation(
    (reason: string) => financeService.cancelReceivable(receivableId, { reason }),
    {
      onSuccess: () => {
        showSuccess("Cobrança cancelada.");
        onClose();
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível cancelar a cobrança."),
        ),
    },
  );

  const handleClose = () => {
    if (cancelar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await cancelar.mutateAsync(data.reason).catch(() => undefined);
  });

  const reasonProps = form.getFieldProps("reason");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cancelar cobrança"
      size="sm"
      disableClose={cancelar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3">
          <p className="text-sm text-neutral-600">
            A cobrança fica registrada como cancelada, com o motivo.
          </p>
          <Textarea
            id="cancel-receivable-reason"
            label="Motivo"
            required
            rows={3}
            name={reasonProps.name}
            value={reasonProps.value}
            onChange={reasonProps.onChange}
            error={reasonProps.error}
          />
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={cancelar.isPending}
            className="ds-btn-outline"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={cancelar.isPending}
            className="ds-btn-primary !bg-red-600 hover:!bg-red-700"
          >
            {cancelar.isPending ? "Cancelando..." : "Cancelar cobrança"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
