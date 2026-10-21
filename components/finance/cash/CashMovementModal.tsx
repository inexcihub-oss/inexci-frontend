"use client";

import { useEffect } from "react";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { cashMovementSchema } from "@/lib/schemas/finance";
import type { CashMovementPayload } from "@/types/finance.types";

export type CashMovementKind = "withdrawal" | "supply";

const TEXTOS: Record<
  CashMovementKind,
  { titulo: string; sucesso: string; erro: string }
> = {
  withdrawal: {
    titulo: "Retirada",
    sucesso: "Retirada registrada.",
    erro: "Não foi possível registrar a retirada.",
  },
  supply: {
    titulo: "Suprimento",
    sucesso: "Suprimento registrado.",
    erro: "Não foi possível registrar o suprimento.",
  },
};

interface CashMovementModalProps {
  kind: CashMovementKind | null;
  onClose: () => void;
}

export function CashMovementModal({ kind, onClose }: CashMovementModalProps) {
  const { showSuccess, showError } = useToast();
  const textos = TEXTOS[kind ?? "withdrawal"];
  const form = useZodForm({
    schema: cashMovementSchema,
    initialValues: { amount: "", description: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (kind) reset();
  }, [kind, reset]);

  const registrar = useFinanceMutation(
    (payload: CashMovementPayload) =>
      kind === "supply"
        ? financeService.supplyCashSession(payload)
        : financeService.withdrawFromCashSession(payload),
    {
      onSuccess: () => {
        showSuccess(textos.sucesso);
        onClose();
      },
      onError: (error) => showError(getApiErrorMessage(error, textos.erro)),
    },
  );

  const handleClose = () => {
    if (registrar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await registrar.mutateAsync(data).catch(() => undefined);
  });

  return (
    <Modal
      isOpen={!!kind}
      onClose={handleClose}
      title={textos.titulo}
      size="sm"
      disableClose={registrar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          <MoneyInput
            label="Valor"
            required
            value={form.values.amount ?? ""}
            onChange={(v) => form.setField("amount", v)}
            error={form.errors.amount}
          />
          <Input
            label="Descrição"
            required
            placeholder={
              kind === "supply" ? "Ex.: Troco" : "Ex.: Depósito no banco"
            }
            {...form.getFieldProps("description")}
          />
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={registrar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={registrar.isPending}
            className="ds-btn-primary"
          >
            {registrar.isPending ? "Salvando..." : "Registrar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
