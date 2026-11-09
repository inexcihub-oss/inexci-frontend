"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { adminService } from "@/services/admin.service";
import { ReasonField } from "./ReasonField";
import { validateReason } from "./reason";
import { useSubscriptionAction } from "./useSubscriptionAction";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
}

export function GrantInternalAccessModal({ isOpen, onClose, ownerId }: Props) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () => adminService.grantInternalAccess(ownerId, { reason: reason.trim() }),
    "Acesso interno concedido.",
    onClose,
  );

  const reasonError = submitted ? validateReason(reason) : null;

  const handleConfirm = () => {
    setSubmitted(true);
    if (validateReason(reason)) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dar acesso interno"
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
            onClick={handleConfirm}
            isLoading={mutation.isPending}
            loadingText="Concedendo..."
          >
            Confirmar
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-gray-700">
          A conta passa a usar tudo sem limite e sem cobrança. Use apenas para
          testes da equipe: não é uma cortesia comercial.
        </p>
        <ReasonField
          id="grant-internal-reason"
          value={reason}
          onChange={(v) => {
            clearError();
            setReason(v);
          }}
          error={reasonError}
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
