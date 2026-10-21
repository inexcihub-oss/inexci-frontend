"use client";

import { useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import {
  ITEM_VAZIO,
  ReceivableItemFields,
  itemPayload,
} from "@/components/finance/receivables/ReceivableItemFields";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { receivableItemSchema } from "@/lib/schemas/finance";
import type {
  ReceivableDetailDto,
  ReceivableItemPayload,
} from "@/types/finance.types";

interface AddReceivableItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivableId: string;
}

export function AddReceivableItemModal({
  isOpen,
  onClose,
  receivableId,
}: AddReceivableItemModalProps) {
  const { showSuccess, showError } = useToast();
  const form = useZodForm({
    schema: receivableItemSchema,
    initialValues: ITEM_VAZIO,
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const adicionar = useFinanceMutation<ReceivableItemPayload, ReceivableDetailDto>(
    (item) => financeService.addReceivableItem(receivableId, item),
    {
      onSuccess: () => {
        showSuccess("Item adicionado.");
        onClose();
      },
      onError: (error) =>
        showError(getApiErrorMessage(error, "Não foi possível adicionar o item.")),
    },
  );

  const handleClose = () => {
    if (adicionar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await adicionar.mutateAsync(itemPayload(data)).catch(() => undefined);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Adicionar item"
      size="sm"
      disableClose={adicionar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6">
          <ReceivableItemFields
            value={form.values}
            onChange={(patch) => form.setValues(patch)}
            errors={form.errors}
          />
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={adicionar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={adicionar.isPending}
            className="ds-btn-primary"
          >
            {adicionar.isPending ? "Salvando..." : "Adicionar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
