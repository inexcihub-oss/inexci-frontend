"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { ReasonField } from "@/components/admin/accounts/subscription/ReasonField";
import { validateReason } from "@/components/admin/accounts/subscription/reason";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { adminKeys } from "@/lib/query-keys";
import { adminService } from "@/services/admin.service";

export type AccountStatusMode = "deactivate" | "reactivate";

const COPY: Record<
  AccountStatusMode,
  {
    title: string;
    confirm: string;
    loading: string;
    success: string;
    fallbackError: string;
  }
> = {
  deactivate: {
    title: "Desativar conta",
    confirm: "Desativar conta",
    loading: "Desativando...",
    success: "Conta desativada. As sessões da clínica foram encerradas.",
    fallbackError: "Não foi possível desativar a conta.",
  },
  reactivate: {
    title: "Reativar conta",
    confirm: "Reativar conta",
    loading: "Reativando...",
    success: "Conta reativada.",
    fallbackError: "Não foi possível reativar a conta.",
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: AccountStatusMode;
  ownerId: string;
  accountName: string;
  blockedReason?: string | null;
}

export function AccountStatusModal({
  isOpen,
  onClose,
  mode,
  ownerId,
  accountName,
  blockedReason = null,
}: Props) {
  const copy = COPY[mode];
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const blocked = mode === "deactivate" && !!blockedReason;

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { reason: reason.trim() };
      return mode === "deactivate"
        ? adminService.deactivateAccount(ownerId, payload)
        : adminService.reactivateAccount(ownerId, payload);
    },
    onMutate: () => setServerError(null),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
      showToast(copy.success, "success");
      setReason("");
      setSubmitted(false);
      onClose();
    },
    onError: (error) => {
      const message = getApiErrorMessage(error, copy.fallbackError);
      setServerError(message);
      showToast(message, "error");
    },
  });

  const reasonError = submitted ? validateReason(reason) : null;

  const handleConfirm = () => {
    setSubmitted(true);
    if (blocked || validateReason(reason)) return;
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={copy.title}
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
            variant={mode === "deactivate" ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={blocked}
            isLoading={mutation.isPending}
            loadingText={copy.loading}
          >
            {copy.confirm}
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        {mode === "deactivate" ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              Ninguém da clínica <strong>{accountName}</strong> vai conseguir
              entrar: as sessões abertas caem na hora e o assistente do WhatsApp
              para de responder.
            </p>
            <p>
              Os dados ficam guardados. Você pode reativar a conta quando
              quiser.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            A equipe da clínica <strong>{accountName}</strong> volta a entrar
            normalmente, com os mesmos dados de antes.
          </p>
        )}
        {blocked && (
          <div
            role="note"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            {blockedReason}
          </div>
        )}
        {!blocked && (
          <ReasonField
            id={`account-${mode}-reason`}
            value={reason}
            onChange={(v) => {
              setServerError(null);
              setReason(v);
            }}
            error={reasonError}
          />
        )}
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
