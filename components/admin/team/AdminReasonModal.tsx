"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import { ReasonField } from "@/components/admin/accounts/subscription/ReasonField";
import { useSubscriptionAction } from "@/components/admin/accounts/subscription/useSubscriptionAction";
import { useZodForm } from "@/hooks/useZodForm";
import { adminReasonSchema } from "@/lib/schemas/admin.schema";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  loadingLabel: string;
  successMessage: string;
  reasonId: string;
  action: (reason: string) => Promise<unknown>;
  children: ReactNode;
}

export function AdminReasonModal({
  isOpen,
  onClose,
  title,
  confirmLabel,
  loadingLabel,
  successMessage,
  reasonId,
  action,
  children,
}: Props) {
  const form = useZodForm({
    schema: adminReasonSchema,
    initialValues: { reason: "" },
  });

  const { mutation, serverError, clearError } = useSubscriptionAction(
    () => action(form.values.reason.trim()),
    successMessage,
    onClose,
  );

  const handleConfirm = form.handleSubmit(() => {
    mutation.mutate();
  });

  const reasonField = form.getFieldProps("reason");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
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
            onClick={() => void handleConfirm()}
            isLoading={mutation.isPending}
            loadingText={loadingLabel}
          >
            {confirmLabel}
          </SpinnerButton>
        </ModalFooter>
      }
    >
      <div className="space-y-4 p-4 md:p-6">
        {children}
        <ReasonField
          id={reasonId}
          value={reasonField.value}
          onChange={(value) => {
            clearError();
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
