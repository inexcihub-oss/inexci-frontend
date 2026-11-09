"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { adminService } from "@/services/admin.service";
import { ReasonField } from "@/components/admin/accounts/subscription/ReasonField";
import { validateReason } from "@/components/admin/accounts/subscription/reason";
import { useSubscriptionAction } from "@/components/admin/accounts/subscription/useSubscriptionAction";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  couponId: string;
  code: string;
}

export function DeactivateCouponModal({
  isOpen,
  onClose,
  couponId,
  code,
}: Props) {
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () => adminService.deactivateCoupon(couponId, { reason: reason.trim() }),
    "Cupom desativado.",
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
      title="Desativar cupom"
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
            loadingText="Desativando..."
          >
            Desativar cupom
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <p className="text-sm text-gray-700">
          Desativar o cupom <strong>{code}</strong>?
        </p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ninguém mais consegue usar o código. Quem já usou continua com o
          desconto.
        </p>
        <ReasonField
          id="deactivate-coupon-reason"
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
