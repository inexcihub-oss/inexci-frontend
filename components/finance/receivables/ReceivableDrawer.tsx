"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { FinanceStatusBadge } from "@/components/finance/FinanceStatusBadge";
import { ReceivePaymentModal } from "@/components/finance/receivables/ReceivePaymentModal";
import { RefundModal } from "@/components/finance/receivables/RefundModal";
import { AddReceivableItemModal } from "@/components/finance/receivables/AddReceivableItemModal";
import { CancelReceivableModal } from "@/components/finance/receivables/CancelReceivableModal";
import { ReceiptButton } from "@/components/finance/ReceiptButton";
import {
  formatDateOnly,
  formatDateTime,
} from "@/components/finance/receivables/format";
import { useReceivable } from "@/hooks/useReceivable";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useToast } from "@/hooks/useToast";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import { centsToDecimal, decimalToCents, formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  REFUND_REASON_LABELS,
  ReceivableStatus,
  type ReceivableDetailDto,
  type ReceivablePaymentDto,
} from "@/types/finance.types";

export interface ReceivableDrawerProps {
  receivableId: string | null;
  isOpen: boolean;
  onClose: () => void;
  openReceiveOnLoad?: boolean;
  renderPaymentActions?: (
    payment: ReceivablePaymentDto,
    receivable: ReceivableDetailDto,
  ) => ReactNode;
}

function refundavelCents(p: ReceivablePaymentDto): number {
  return decimalToCents(p.amount) - decimalToCents(p.refundedAmount);
}

export function ReceivableDrawer({
  receivableId,
  isOpen,
  onClose,
  openReceiveOnLoad = false,
  renderPaymentActions,
}: ReceivableDrawerProps) {
  const { showSuccess, showError } = useToast();
  const { data: cobranca, isLoading, isError, refetch } = useReceivable(
    isOpen ? receivableId : null,
  );
  const [recebendo, setRecebendo] = useState(false);
  const [estornando, setEstornando] = useState<ReceivablePaymentDto | null>(
    null,
  );
  const [adicionando, setAdicionando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [itemACancelar, setItemACancelar] = useState<string | null>(null);
  const abriuRecebimento = useRef(false);

  const cancelada = cobranca?.status === ReceivableStatus.CANCELLED;
  const saldoCents = cobranca ? decimalToCents(cobranca.balance) : 0;
  const podeReceber = !!cobranca && !cancelada && saldoCents > 0;
  const podeCancelar =
    !!cobranca && !cancelada && decimalToCents(cobranca.paidAmount) === 0;

  useEffect(() => {
    if (!isOpen) {
      abriuRecebimento.current = false;
      setItemACancelar(null);
      return;
    }
    if (openReceiveOnLoad && podeReceber && !abriuRecebimento.current) {
      abriuRecebimento.current = true;
      setRecebendo(true);
    }
  }, [isOpen, openReceiveOnLoad, podeReceber]);

  const cancelarItem = useFinanceMutation(
    (itemId: string) =>
      financeService.cancelReceivableItem(receivableId as string, itemId),
    {
      onSuccess: () => {
        setItemACancelar(null);
        showSuccess("Item cancelado.");
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível cancelar o item."),
        ),
    },
  );

  const footer =
    cobranca && !cancelada ? (
      <ModalFooter>
        {podeCancelar ? (
          <button
            type="button"
            onClick={() => setCancelando(true)}
            className="text-sm font-semibold text-red-600 hover:underline min-h-[44px]"
          >
            Cancelar cobrança
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAdicionando(true)}
            className="ds-btn-outline"
          >
            Adicionar item
          </button>
          {podeReceber && (
            <button
              type="button"
              onClick={() => setRecebendo(true)}
              className="ds-btn-primary"
            >
              Receber
            </button>
          )}
        </div>
      </ModalFooter>
    ) : undefined;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Cobrança"
        variant="drawer"
        footer={footer}
      >
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : isError || !cobranca ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <p className="text-sm text-red-600">
              Não foi possível carregar a cobrança.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-sm font-semibold text-teal-700 hover:underline min-h-[44px]"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-5 min-w-0">
            <section className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold text-neutral-900 truncate">
                    {cobranca.patient.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Referência {formatDateOnly(cobranca.referenceDate)}
                    {cobranca.dueDate &&
                      ` · Vencimento ${formatDateOnly(cobranca.dueDate)}`}
                  </p>
                </div>
                <FinanceStatusBadge status={cobranca.status} />
              </div>
              <dl className="rounded-xl bg-neutral-50 px-3 py-1 divide-y divide-neutral-100">
                <Valor rotulo="Total" valor={cobranca.totalAmount} />
                <Valor rotulo="Pago" valor={cobranca.paidAmount} />
                <Valor
                  rotulo="Saldo"
                  valor={cancelada ? null : cobranca.balance}
                  destaque={!cancelada}
                />
              </dl>
              {cancelada && (
                <p className="text-xs text-neutral-600 bg-neutral-50 rounded-lg px-3 py-2 [overflow-wrap:anywhere]">
                  Cancelada
                  {cobranca.cancelledBy && ` por ${cobranca.cancelledBy.name}`}
                  {cobranca.cancelledAt &&
                    ` em ${formatDateTime(cobranca.cancelledAt)}`}
                  {cobranca.cancelReason && `: ${cobranca.cancelReason}`}
                </p>
              )}
            </section>

            <section aria-labelledby="cobranca-itens">
              <h3
                id="cobranca-itens"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
              >
                Itens
              </h3>
              <ul className="flex flex-col divide-y divide-neutral-100 border border-neutral-100 rounded-xl">
                {cobranca.items.map((item) => {
                  const itemCancelado = !!item.cancelledAt;
                  return (
                    <li key={item.id} className="px-3 py-2.5 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-medium text-neutral-900 [overflow-wrap:anywhere]",
                              itemCancelado && "line-through text-neutral-400",
                            )}
                          >
                            {item.description}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {item.executedBy?.name ?? "Sem profissional"}
                            {item.quantity > 1 && ` · ${item.quantity}x`}
                            {itemCancelado && " · cancelado"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-semibold text-neutral-800 shrink-0",
                            itemCancelado && "line-through text-neutral-400",
                          )}
                        >
                          {formatMoney(item.total)}
                        </span>
                      </div>
                      {!cancelada && !itemCancelado && (
                        <div className="flex justify-end gap-3">
                          {itemACancelar === item.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setItemACancelar(null)}
                                className="text-xs font-semibold text-neutral-600 hover:underline min-h-[32px]"
                              >
                                Voltar
                              </button>
                              <button
                                type="button"
                                disabled={cancelarItem.isPending}
                                onClick={() => cancelarItem.mutate(item.id)}
                                className="text-xs font-semibold text-red-600 hover:underline min-h-[32px] disabled:opacity-50"
                              >
                                Confirmar cancelamento
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setItemACancelar(item.id)}
                              className="text-xs font-semibold text-red-600 hover:underline min-h-[32px]"
                            >
                              Cancelar item
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="cobranca-pagamentos">
              <h3
                id="cobranca-pagamentos"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2"
              >
                Pagamentos
              </h3>
              {cobranca.payments.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Nenhum pagamento registrado.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cobranca.payments.map((p) => (
                    <li
                      key={p.id}
                      data-testid="pagamento"
                      className="border border-neutral-100 rounded-xl px-3 py-2.5 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-900">
                            {PAYMENT_METHOD_LABELS[p.method]}
                            {p.method === PaymentMethod.CREDIT_CARD &&
                              p.installments &&
                              ` · ${p.installments}x`}
                            {p.cardBrand && ` · ${p.cardBrand}`}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {formatDateTime(p.paidAt)}
                            {p.account && ` · ${p.account.name}`}
                            {p.receivedBy && ` · ${p.receivedBy.name}`}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-neutral-800 shrink-0">
                          {formatMoney(p.amount)}
                        </span>
                      </div>
                      {p.refunds.length > 0 && (
                        <ul className="flex flex-col gap-1 pl-3 border-l-2 border-red-100">
                          {p.refunds.map((r) => (
                            <li key={r.id} className="text-xs text-red-700 [overflow-wrap:anywhere]">
                              Estorno de {formatMoney(r.amount)} ·{" "}
                              {REFUND_REASON_LABELS[r.reason]} ·{" "}
                              {formatDateTime(r.createdAt)}
                              {r.refundedBy && ` · ${r.refundedBy.name}`}
                              {r.notes && (
                                <span className="block text-neutral-500">
                                  {r.notes}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap justify-end items-center gap-3">
                        <ReceiptButton paymentId={p.id} />
                        {renderPaymentActions?.(p, cobranca)}
                        {!cancelada && refundavelCents(p) > 0 && (
                          <button
                            type="button"
                            onClick={() => setEstornando(p)}
                            className="text-xs font-semibold text-red-600 hover:underline min-h-[32px]"
                          >
                            Estornar
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {cobranca.notes && (
              <p className="text-xs text-neutral-500 [overflow-wrap:anywhere]">
                {cobranca.notes}
              </p>
            )}
          </div>
        )}
      </Modal>

      {cobranca && (
        <>
          <ReceivePaymentModal
            isOpen={recebendo}
            onClose={() => setRecebendo(false)}
            receivable={cobranca}
          />
          {estornando && (
            <RefundModal
              isOpen
              onClose={() => setEstornando(null)}
              payment={estornando}
            />
          )}
          <AddReceivableItemModal
            isOpen={adicionando}
            onClose={() => setAdicionando(false)}
            receivableId={cobranca.id}
          />
          <CancelReceivableModal
            isOpen={cancelando}
            onClose={() => setCancelando(false)}
            receivableId={cobranca.id}
          />
        </>
      )}
    </>
  );
}

function Valor({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string | null;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-xs text-neutral-500">{rotulo}</dt>
      <dd
        className={cn(
          "text-sm font-semibold tabular-nums text-right [overflow-wrap:anywhere]",
          destaque ? "text-teal-800" : "text-neutral-800",
        )}
      >
        {valor === null ? "—" : formatMoney(centsToDecimal(decimalToCents(valor)))}
      </dd>
    </div>
  );
}
