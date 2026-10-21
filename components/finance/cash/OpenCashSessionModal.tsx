"use client";

import { useEffect, useMemo } from "react";
import Select from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useFinancialAccounts } from "@/hooks/useFinanceSettings";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { openCashSessionSchema } from "@/lib/schemas/finance";
import {
  FinancialAccountType,
  type OpenCashSessionPayload,
} from "@/types/finance.types";

interface OpenCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenCashSessionModal({
  isOpen,
  onClose,
}: OpenCashSessionModalProps) {
  const { showSuccess, showError } = useToast();
  const { data: contas = [] } = useFinancialAccounts();
  const caixas = useMemo(
    () =>
      contas.filter(
        (c) => c.active && c.type === FinancialAccountType.CASH_DRAWER,
      ),
    [contas],
  );
  const primeiro = caixas[0]?.id ?? "";
  const form = useZodForm({
    schema: openCashSessionSchema,
    initialValues: { accountId: primeiro, openingAmount: "R$ 0,00" },
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset({ accountId: primeiro, openingAmount: "R$ 0,00" });
  }, [isOpen, primeiro, reset]);

  const abrir = useFinanceMutation(
    (payload: OpenCashSessionPayload) => financeService.openCashSession(payload),
    {
      onSuccess: () => {
        showSuccess("Caixa aberto.");
        onClose();
      },
      onError: (error) =>
        showError(getApiErrorMessage(error, "Não foi possível abrir o caixa.")),
    },
  );

  const handleClose = () => {
    if (abrir.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await abrir.mutateAsync(data).catch(() => undefined);
  });

  const accountProps = form.getFieldProps("accountId");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Abrir caixa"
      size="sm"
      disableClose={abrir.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          {caixas.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Cadastre uma conta do tipo &quot;Caixa físico&quot; em
              Configurações do financeiro para abrir o caixa.
            </p>
          ) : (
            <Select
              label="Caixa"
              required
              options={[
                { value: "", label: "Selecione o caixa" },
                ...caixas.map((c) => ({ value: c.id, label: c.name })),
              ]}
              name={accountProps.name}
              value={accountProps.value}
              onChange={accountProps.onChange}
              error={accountProps.error}
            />
          )}
          <MoneyInput
            label="Valor de abertura"
            value={form.values.openingAmount ?? ""}
            onChange={(v) => form.setField("openingAmount", v)}
            error={form.errors.openingAmount}
            required
          />
        </div>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={handleClose}
            disabled={abrir.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={abrir.isPending || caixas.length === 0}
            className="ds-btn-primary"
          >
            {abrir.isPending ? "Abrindo..." : "Abrir caixa"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
