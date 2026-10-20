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
import { getApiErrorMessage } from "@/lib/http-error";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState("");
  const [attempted, setAttempted] = useState(false);
  const { showToast } = useToast();

  const rescheduleMutation = useSurgeryRequestMutation(
    solicitacao.id,
    (isoDate: string) =>
      surgeryRequestService.reschedule(solicitacao.id, { newDate: isoDate }),
    {
      onSuccess: () => {
        showToast("Cirurgia reagendada com sucesso.", "success");
        setNewDate("");
        onSuccess();
      },
      onError: (error) => {
        showToast(
          getApiErrorMessage(
            error,
            "Erro ao reagendar cirurgia. Tente novamente.",
          ),
          "error",
        );
      },
    },
  );
  const isSaving = rescheduleMutation.isPending;

  const handleClose = () => {
    if (isSaving) return;
    setNewDate("");
    setAttempted(false);
    onClose();
  };

  const handleSubmit = () => {
    if (!newDate.trim()) {
      setAttempted(true);
      showToast("Informe a nova data da cirurgia.", "error");
      return;
    }
    rescheduleMutation.mutate(new Date(newDate).toISOString());
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Reagendar Cirurgia"
        size="sm"
        disableClose={isSaving}
      >
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <p className="text-xs md:text-sm text-gray-500">
            Informe a nova data para a realização da cirurgia.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="reschedule-date" className="block ds-label mb-0">
              Nova Data <span className="text-red-500">*</span>
            </label>
            <input
              id="reschedule-date"
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              disabled={isSaving}
              aria-invalid={attempted && !newDate.trim() ? true : undefined}
              className={`ds-input disabled:opacity-50 ${attempted && !newDate.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
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
            {isSaving ? "Salvando..." : "Reagendar"}
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
