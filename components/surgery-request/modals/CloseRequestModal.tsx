"use client";

import React, { useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useToast } from "@/hooks/useToast";
import { useSurgeryRequestMutation } from "@/hooks/useSurgeryRequestMutation";
import { getApiErrorMessage } from "@/lib/http-error";

interface CloseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
}

export function CloseRequestModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: CloseRequestModalProps) {
  const [reason, setReason] = useState("");
  const { showToast } = useToast();

  const closeMutation = useSurgeryRequestMutation(
    surgeryRequestId,
    (motivo: string) =>
      surgeryRequestService.close(surgeryRequestId, {
        reason: motivo || undefined,
      }),
    {
      onSuccess: () => {
        showToast("Solicitação encerrada com sucesso", "success");
        setReason("");
        onSuccess();
      },
      onError: (error) => {
        showToast(
          getApiErrorMessage(error, "Erro ao encerrar solicitação"),
          "error",
        );
      },
    },
  );
  const isClosing = closeMutation.isPending;

  const handleClose = () => {
    if (isClosing) return;
    setReason("");
    onClose();
  };

  const handleConfirm = () => {
    if (isClosing) return;
    closeMutation.mutate(reason.trim());
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Deseja encerrar a solicitação?"
        disableClose={isClosing}
      >
        <div className="px-4 py-4 md:px-6 md:py-6 space-y-4">
          <p className="text-sm md:text-base text-neutral-900 leading-relaxed">
            Essa solicitação será encerrada e movida para o status
            &ldquo;Encerrada&rdquo; como incompleta.
          </p>
          <div>
            <label
              htmlFor="close-request-reason"
              className="ds-label block mb-1.5"
            >
              Motivo do encerramento (opcional)
            </label>
            <textarea
              id="close-request-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo do encerramento para consulta futura..."
              rows={4}
              disabled={isClosing}
              className="ds-textarea"
            />
          </div>
        </div>

        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing}
            className="ds-btn-outline disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isClosing}
            className="ds-btn-danger disabled:opacity-50"
          >
            {isClosing ? "Encerrando..." : "Encerrar"}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
