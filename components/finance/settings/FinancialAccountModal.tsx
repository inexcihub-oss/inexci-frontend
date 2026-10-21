"use client";

import { useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  financialAccountSchema,
  type FinancialAccountInput,
  type FinancialAccountValues,
} from "@/lib/schemas/finance";
import {
  FINANCIAL_ACCOUNT_TYPES,
  FINANCIAL_ACCOUNT_TYPE_LABELS,
  FinancialAccountType,
  type FinancialAccountDto,
} from "@/types/finance.types";

interface FinancialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: FinancialAccountDto | null;
  onSaved?: (account: FinancialAccountDto) => void;
}

const VAZIO: FinancialAccountInput = {
  name: "",
  type: FinancialAccountType.CASH_DRAWER,
  notes: "",
};

const TYPE_OPTIONS = FINANCIAL_ACCOUNT_TYPES.map((type) => ({
  value: type,
  label: FINANCIAL_ACCOUNT_TYPE_LABELS[type],
}));

function valoresDe(account?: FinancialAccountDto | null): FinancialAccountInput {
  if (!account) return VAZIO;
  return { name: account.name, type: account.type, notes: account.notes ?? "" };
}

export function FinancialAccountModal({
  isOpen,
  onClose,
  account,
  onSaved,
}: FinancialAccountModalProps) {
  const editando = !!account;
  const { showSuccess, showError } = useToast();
  const form = useZodForm({
    schema: financialAccountSchema,
    initialValues: valoresDe(account),
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset(valoresDe(account));
  }, [isOpen, account, reset]);

  const salvar = useFinanceMutation(
    (data: FinancialAccountValues) => {
      const payload = {
        name: data.name,
        type: data.type,
        notes: data.notes ? data.notes : undefined,
      };
      return account
        ? financeService.updateAccount(account.id, payload)
        : financeService.createAccount(payload);
    },
    {
      invalidate: [financeKeys.accounts(), financeKeys.paymentMethods()],
      onSuccess: (salva) => {
        showSuccess(editando ? "Conta atualizada." : "Conta criada.");
        onSaved?.(salva);
        onClose();
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível salvar a conta."),
        ),
    },
  );

  const handleClose = () => {
    if (salvar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await salvar.mutateAsync(data).catch(() => undefined);
  });

  const typeProps = form.getFieldProps("type");
  const notesProps = form.getFieldProps("notes");

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={editando ? "Editar conta" : "Nova conta"}
      disableClose={salvar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-3 md:gap-5">
          <Input
            label="Nome"
            placeholder="Ex.: Caixa Físico, Stone, Cora"
            required
            {...form.getFieldProps("name")}
          />
          <Select
            label="Tipo"
            options={TYPE_OPTIONS}
            name={typeProps.name}
            value={typeProps.value}
            onChange={typeProps.onChange}
            error={typeProps.error}
          />
          <Textarea
            id="financial-account-notes"
            label="Observações"
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
            disabled={salvar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvar.isPending}
            className="ds-btn-primary"
          >
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
