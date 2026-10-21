"use client";

import { useEffect, useMemo } from "react";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  applyBRLMask,
  centsToDecimal,
  decimalToCents,
  formatMoney,
} from "@/lib/currency";
import { createRefundSchema, type RefundInput } from "@/lib/schemas/finance";
import {
  PAYMENT_METHOD_LABELS,
  REFUND_REASONS,
  REFUND_REASON_LABELS,
  type CreateRefundPayload,
  type ReceivableDetailDto,
  type ReceivablePaymentDto,
} from "@/types/finance.types";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Pick<
    ReceivablePaymentDto,
    "id" | "amount" | "refundedAmount" | "method"
  >;
  onRefunded?: (receivable: ReceivableDetailDto) => void;
}

const MOTIVOS = [
  { value: "", label: "Selecione o motivo" },
  ...REFUND_REASONS.map((r) => ({ value: r, label: REFUND_REASON_LABELS[r] })),
];

export function RefundModal({
  isOpen,
  onClose,
  payment,
  onRefunded,
}: RefundModalProps) {
  const { showSuccess, showError } = useToast();
  const disponivelCents =
    decimalToCents(payment.amount) - decimalToCents(payment.refundedAmount);
  const schema = useMemo(
    () => createRefundSchema(disponivelCents),
    [disponivelCents],
  );
  const inicial: RefundInput = {
    amount: disponivelCents > 0 ? applyBRLMask(String(disponivelCents)) : "",
    reason: "" as RefundInput["reason"],
    notes: "",
  };
  const form = useZodForm({ schema, initialValues: inicial });
  const { reset } = form;

  useEffect(() => {
    if (!isOpen) return;
    reset({
      amount: disponivelCents > 0 ? applyBRLMask(String(disponivelCents)) : "",
      reason: "" as RefundInput["reason"],
      notes: "",
    });
  }, [isOpen, disponivelCents, reset]);

  const estornar = useFinanceMutation(
    (payload: CreateRefundPayload) =>
      financeService.refundPayment(payment.id, payload),
    {
      onSuccess: (atualizada) => {
        showSuccess("Estorno registrado.");
        onRefunded?.(atualizada);
        onClose();
      },
      onError: (error) =>
        showError(getApiErrorMessage(error, "Não foi possível estornar.")),
    },
  );

  const handleClose = () => {
    if (estornar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await estornar
      .mutateAsync({
        amount: data.amount,
        reason: data.reason,
        notes: data.notes ? data.notes : undefined,
      })
      .catch(() => undefined);
  });

  const reasonProps = form.getFieldProps("reason");
  const notesProps = form.getFieldProps("notes");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Estornar pagamento"
      size="sm"
      disableClose={estornar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            {PAYMENT_METHOD_LABELS[payment.method]} de{" "}
            {formatMoney(payment.amount)}. Pode estornar até{" "}
            <strong>{formatMoney(centsToDecimal(disponivelCents))}</strong>.
          </p>
          <MoneyInput
            label="Valor do estorno"
            value={form.values.amount ?? ""}
            onChange={(v) => form.setField("amount", v)}
            error={form.errors.amount}
            required
          />
          <Select
            label="Motivo"
            required
            options={MOTIVOS}
            name={reasonProps.name}
            value={reasonProps.value}
            onChange={reasonProps.onChange}
            error={reasonProps.error}
          />
          <Textarea
            id="refund-notes"
            label="Observação"
            rows={3}
            name={notesProps.name}
            value={notesProps.value}
            onChange={notesProps.onChange}
            error={notesProps.error}
          />
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={estornar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={estornar.isPending || disponivelCents <= 0}
            className="ds-btn-primary"
          >
            {estornar.isPending ? "Estornando..." : "Estornar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
