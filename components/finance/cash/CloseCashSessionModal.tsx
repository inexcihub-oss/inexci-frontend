"use client";

import { useEffect, useMemo } from "react";
import Textarea from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/permissions";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { centsToDecimal, decimalToCents, formatMoney } from "@/lib/currency";
import {
  centavosDaMascara,
  createCloseCashSessionSchema,
  LIMITE_DIFERENCA_SEM_ADMINISTRACAO_CENTAVOS,
  LIMITE_DIFERENCA_SEM_JUSTIFICATIVA_CENTAVOS,
  MENSAGEM_DIFERENCA_SO_ADMINISTRACAO,
} from "@/lib/schemas/finance";
import { cn } from "@/lib/utils";
import type {
  CashSessionSummaryDto,
  CloseCashSessionPayload,
} from "@/types/finance.types";

interface CloseCashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Pick<CashSessionSummaryDto, "id" | "cashBalance" | "user" | "account">;
  ofOtherUser?: boolean;
}

export function diferencaEmCentavos(
  countedMask: string,
  expectedDecimal: string,
): number | null {
  if (countedMask.replace(/\D/g, "") === "") return null;
  return centavosDaMascara(countedMask) - decimalToCents(expectedDecimal);
}

export function CloseCashSessionModal({
  isOpen,
  onClose,
  session,
  ofOtherUser = false,
}: CloseCashSessionModalProps) {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();
  const podeAdministrar = can(Permission.ADMINISTRACAO);
  const expectedCents = decimalToCents(session.cashBalance);
  const schema = useMemo(
    () => createCloseCashSessionSchema({ expectedCents, podeAdministrar }),
    [expectedCents, podeAdministrar],
  );
  const form = useZodForm({
    schema,
    initialValues: { countedAmount: "", notes: "" },
  });
  const { reset } = form;

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const fechar = useFinanceMutation(
    (payload: CloseCashSessionPayload) =>
      ofOtherUser
        ? financeService.closeCashSession(session.id, payload)
        : financeService.closeCurrentCashSession(payload),
    {
      onSuccess: () => {
        showSuccess("Caixa fechado.");
        onClose();
      },
      onError: (error) =>
        showError(getApiErrorMessage(error, "Não foi possível fechar o caixa.")),
    },
  );

  const handleClose = () => {
    if (fechar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await fechar
      .mutateAsync({
        countedAmount: data.countedAmount,
        notes: data.notes ? data.notes : undefined,
      })
      .catch(() => undefined);
  });

  const diferenca = diferencaEmCentavos(
    form.values.countedAmount ?? "",
    session.cashBalance,
  );
  const notesProps = form.getFieldProps("notes");
  const diferencaAbsoluta = diferenca === null ? 0 : Math.abs(diferenca);
  const exigeJustificativa =
    diferencaAbsoluta > LIMITE_DIFERENCA_SEM_JUSTIFICATIVA_CENTAVOS;
  const exigeAdministracao =
    diferencaAbsoluta > LIMITE_DIFERENCA_SEM_ADMINISTRACAO_CENTAVOS;
  const bloqueado = exigeAdministracao && !podeAdministrar;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Fechar caixa"
      size="sm"
      disableClose={fechar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            {session.account.name}
            {ofOtherUser && ` · aberto por ${session.user.name}`}
          </p>
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span className="text-sm text-neutral-600">Esperado em dinheiro</span>
            <span
              data-testid="valor-esperado"
              className="text-sm font-semibold text-neutral-900"
            >
              {formatMoney(session.cashBalance)}
            </span>
          </div>
          <MoneyInput
            label="Valor contado"
            required
            value={form.values.countedAmount ?? ""}
            onChange={(v) => form.setField("countedAmount", v)}
            error={form.errors.countedAmount}
          />
          {diferenca !== null && (
            <div
              data-testid="diferenca-caixa"
              role="status"
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-3 border",
                diferenca === 0
                  ? "bg-green-50 border-green-200 text-green-800"
                  : diferenca > 0
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-red-50 border-red-200 text-red-700",
              )}
            >
              <span className="text-sm font-semibold">
                {diferenca === 0
                  ? "Sem diferença"
                  : diferenca > 0
                    ? "Sobra"
                    : "Falta"}
              </span>
              <span className="text-lg font-bold">
                {formatMoney(centsToDecimal(Math.abs(diferenca)))}
              </span>
            </div>
          )}
          {exigeAdministracao && (
            <p
              role="alert"
              data-testid="aviso-diferenca-administracao"
              className={cn(
                "text-xs font-medium rounded-lg px-3 py-2 border",
                bloqueado
                  ? "text-red-700 bg-red-50 border-red-200"
                  : "text-amber-800 bg-amber-50 border-amber-200",
              )}
            >
              {MENSAGEM_DIFERENCA_SO_ADMINISTRACAO}
            </p>
          )}
          <Textarea
            id="close-cash-notes"
            label={exigeJustificativa ? "Justificativa" : "Observação"}
            required={exigeJustificativa}
            placeholder={
              exigeJustificativa
                ? "Diferença acima de R$ 50,00: explique o motivo."
                : undefined
            }
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
            disabled={fechar.isPending}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={fechar.isPending || bloqueado}
            className="ds-btn-primary"
          >
            {fechar.isPending ? "Fechando..." : "Fechar caixa"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
