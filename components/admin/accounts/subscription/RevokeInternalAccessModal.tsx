"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { adminService } from "@/services/admin.service";
import { ReasonField } from "./ReasonField";
import { validateReason } from "./reason";
import { useSubscriptionAction } from "./useSubscriptionAction";

const DEFAULT_TRIAL_DAYS = 15;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
}

export function RevokeInternalAccessModal({ isOpen, onClose, ownerId }: Props) {
  const [target, setTarget] = useState<"trial" | "canceled">("trial");
  const [trialDays, setTrialDays] = useState(String(DEFAULT_TRIAL_DAYS));
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const days = Number(trialDays);
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 90;

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () =>
      adminService.revokeInternalAccess(ownerId, {
        to: target,
        reason: reason.trim(),
        ...(target === "trial" ? { trialDays: days } : {}),
      }),
    "Acesso interno encerrado.",
    onClose,
  );

  const reasonError = submitted ? validateReason(reason) : null;
  const daysError =
    submitted && target === "trial" && !daysValid
      ? "Informe de 1 a 90 dias."
      : undefined;

  const handleConfirm = () => {
    setSubmitted(true);
    if (validateReason(reason)) return;
    if (target === "trial" && !daysValid) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Encerrar acesso interno"
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
            loadingText="Encerrando..."
          >
            Confirmar
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        <fieldset className="space-y-2">
          <legend className="ds-label">Depois do acesso interno</legend>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="revoke-target"
              checked={target === "trial"}
              onChange={() => setTarget("trial")}
            />
            Voltar para trial de N dias
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name="revoke-target"
              checked={target === "canceled"}
              onChange={() => setTarget("canceled")}
            />
            Cancelar
          </label>
        </fieldset>

        {target === "trial" && (
          <Input
            label="Dias de trial"
            type="number"
            min={1}
            max={90}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            error={daysError}
          />
        )}

        <ReasonField
          id="revoke-internal-reason"
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
