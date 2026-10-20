"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useToast } from "@/hooks/useToast";
import { useSurgeryRequestMutation } from "@/hooks/useSurgeryRequestMutation";
import { getApiErrorMessage, getTransitionBlockError } from "@/lib/http-error";

interface DefineSurgeryDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

export function DefineSurgeryDateModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: DefineSurgeryDateModalProps) {
  const [date, setDate] = useState("");
  const [attempted, setAttempted] = useState(false);
  const { showToast } = useToast();

  const defineMutation = useSurgeryRequestMutation(
    solicitacao.id,
    async (isoDate: string) => {
      await surgeryRequestService.updateDateOptions(solicitacao.id, {
        dateOptions: [isoDate],
      });
      await surgeryRequestService.confirmDate(solicitacao.id, {
        selectedDateIndex: 0,
      });
    },
    {
      onSuccess: () => {
        showToast("Data confirmada! Status alterado para Agendada.", "success");
        setDate("");
        onSuccess();
      },
      onError: (error) => {
        showToast(
          getTransitionBlockError(error) ??
            getApiErrorMessage(error, "Erro ao confirmar data. Tente novamente."),
          "error",
        );
      },
    },
  );
  const isSaving = defineMutation.isPending;

  const handleClose = () => {
    if (isSaving) return;
    setDate("");
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!date.trim()) {
      setAttempted(true);
      showToast("Informe a data e hora da cirurgia.", "error");
      return;
    }
    defineMutation.mutate(new Date(date).toISOString());
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Definir Data da Cirurgia"
        size="sm"
        disableClose={isSaving}
      >
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <p className="text-xs md:text-sm text-gray-500">
            Nenhuma data foi proposta. Informe a data e hora da cirurgia para
            confirmar o agendamento.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="define-surgery-date" className="block ds-label mb-0">
              Data e Hora <span className="text-red-500">*</span>
            </label>
            <input
              id="define-surgery-date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              aria-invalid={attempted && !date.trim() ? true : undefined}
              className={`ds-input disabled:opacity-50 ${attempted && !date.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
            />
          </div>
        </div>

        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="ds-btn-outline disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Confirmando..." : "Confirmar Data"}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
