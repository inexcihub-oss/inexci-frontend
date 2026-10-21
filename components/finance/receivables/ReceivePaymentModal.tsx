"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import {
  useFinancialAccounts,
  usePaymentMethodConfigs,
} from "@/hooks/useFinanceSettings";
import { useCurrentCashSession } from "@/hooks/useCurrentCashSession";
import { financeService } from "@/services/finance.service";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  applyBRLMask,
  centsToDecimal,
  decimalToCents,
  formatMoney,
} from "@/lib/currency";
import {
  centavosDaMascara,
  createReceivePaymentSchema,
  type PaymentLineInput,
} from "@/lib/schemas/finance";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PaymentMethod,
  type PaymentMethodConfigDto,
  type ReceivableDetailDto,
} from "@/types/finance.types";

interface ReceivePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Pick<ReceivableDetailDto, "id" | "balance" | "patient">;
  onPaid?: (receivable: ReceivableDetailDto) => void;
}

const CARTOES: PaymentMethod[] = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
];

function mascaraDeCentavos(cents: number): string {
  return cents > 0 ? applyBRLMask(String(cents)) : "";
}

function novaLinha(
  config: PaymentMethodConfigDto | undefined,
  cents: number,
): PaymentLineInput {
  return {
    method: config?.method ?? PaymentMethod.PIX,
    amount: mascaraDeCentavos(cents),
    accountId: config?.defaultAccountId ?? "",
    installments: 1,
    cardBrand: "",
    nsu: "",
    authorizationCode: "",
  };
}

export function ReceivePaymentModal({
  isOpen,
  onClose,
  receivable,
  onPaid,
}: ReceivePaymentModalProps) {
  const { showSuccess, showError } = useToast();
  const { data: configs = [] } = usePaymentMethodConfigs();
  const { data: contas = [] } = useFinancialAccounts();
  const caixa = useCurrentCashSession({ enabled: isOpen });
  const sessao = caixa.data?.session ?? null;
  const caixaAberto = !!sessao;
  const saldoCents = decimalToCents(receivable.balance);

  const ativas = useMemo(
    () =>
      PAYMENT_METHODS.map((m) => configs.find((c) => c.method === m)).filter(
        (c): c is PaymentMethodConfigDto => !!c && c.active,
      ),
    [configs],
  );
  const configPorForma = useMemo(
    () => new Map(ativas.map((c) => [c.method, c] as const)),
    [ativas],
  );
  const maxParcelas = useMemo(() => {
    const mapa: Partial<Record<PaymentMethod, number>> = {};
    for (const c of ativas) mapa[c.method] = c.maxInstallments;
    return mapa;
  }, [ativas]);

  const schema = useMemo(
    () =>
      createReceivePaymentSchema({
        balanceCents: saldoCents,
        maxInstallmentsByMethod: maxParcelas,
        cashSessionOpen: caixaAberto,
      }),
    [saldoCents, maxParcelas, caixaAberto],
  );

  const form = useZodForm({
    schema,
    initialValues: { lines: [novaLinha(undefined, saldoCents)] },
  });
  const { reset } = form;
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  useEffect(() => {
    setIdempotencyKey(isOpen ? crypto.randomUUID() : null);
  }, [isOpen]);

  const formaInicial = configPorForma.get(PaymentMethod.PIX) ?? ativas[0];
  const metodoInicial = formaInicial?.method;
  const contaInicial = formaInicial?.defaultAccountId ?? null;
  useEffect(() => {
    if (!isOpen) return;
    reset({
      lines: [
        novaLinha(
          metodoInicial
            ? {
                method: metodoInicial,
                active: true,
                defaultAccountId: contaInicial,
                defaultAccount: null,
                maxInstallments: 1,
              }
            : undefined,
          saldoCents,
        ),
      ],
    });
  }, [isOpen, metodoInicial, contaInicial, saldoCents, reset]);

  const linhas = form.values.lines;
  const somaCents = linhas.reduce(
    (total, l) => total + centavosDaMascara(l.amount),
    0,
  );
  const restanteCents = saldoCents - somaCents;
  const temDinheiroSemCaixa =
    !caixaAberto && linhas.some((l) => l.method === PaymentMethod.CASH);

  const atualizarLinha = (index: number, patch: Partial<PaymentLineInput>) => {
    form.setField(
      "lines",
      linhas.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  };

  const trocarForma = (index: number, method: PaymentMethod) => {
    atualizarLinha(index, {
      method,
      accountId: configPorForma.get(method)?.defaultAccountId ?? "",
      installments: 1,
      cardBrand: "",
      nsu: "",
      authorizationCode: "",
    });
  };

  const adicionarLinha = () => {
    const usadas = new Set(linhas.map((l) => l.method));
    const proxima = ativas.find((c) => !usadas.has(c.method)) ?? ativas[0];
    form.setField("lines", [
      ...linhas,
      novaLinha(proxima, Math.max(restanteCents, 0)),
    ]);
  };

  const removerLinha = (index: number) => {
    form.setField(
      "lines",
      linhas.filter((_, i) => i !== index),
    );
  };

  const registrar = useFinanceMutation(
    (lines: ReturnType<typeof schema.parse>["lines"]) =>
      financeService.registerPayment(receivable.id, {
        lines,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }),
    {
      onSuccess: (atualizada) => {
        showSuccess("Pagamento registrado.");
        onPaid?.(atualizada);
        onClose();
      },
      onError: (error) =>
        showError(
          getApiErrorMessage(error, "Não foi possível registrar o pagamento."),
        ),
    },
  );

  const handleClose = () => {
    if (registrar.isPending) return;
    onClose();
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await registrar.mutateAsync(data.lines).catch(() => undefined);
  });

  const opcoesForma = ativas.map((c) => ({
    value: c.method,
    label: PAYMENT_METHOD_LABELS[c.method],
  }));
  const opcoesConta = [
    { value: "", label: "Selecione a conta" },
    ...contas.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Receber pagamento"
      disableClose={registrar.isPending}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="px-4 py-4 md:px-6 md:py-6 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">
                {receivable.patient.name}
              </p>
              <p className="text-xs text-neutral-500">
                Saldo em aberto {formatMoney(receivable.balance)}
              </p>
            </div>
            <span
              data-testid="indicador-caixa"
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium",
                caixaAberto
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-neutral-100 text-neutral-600 border-neutral-200",
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  caixaAberto ? "bg-green-600" : "bg-neutral-400",
                )}
              />
              {caixa.isLoading
                ? "Verificando caixa..."
                : caixaAberto
                  ? "Caixa aberto"
                  : "Caixa fechado"}
            </span>
          </div>

          {ativas.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nenhuma forma de pagamento ativa. Ative em Configurações do
              financeiro.
            </p>
          )}

          <ul className="flex flex-col gap-3" aria-label="Formas de pagamento">
            {linhas.map((linha, index) => {
              const erro = (campo: string) =>
                form.errors[`lines.${index}.${campo}`];
              const max =
                linha.method === PaymentMethod.CREDIT_CARD
                  ? (maxParcelas[PaymentMethod.CREDIT_CARD] ?? 1)
                  : 1;
              const ehCartao = CARTOES.includes(linha.method);
              return (
                <li
                  key={index}
                  className="rounded-xl border border-neutral-200 p-3 flex flex-col gap-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Forma de pagamento"
                      options={opcoesForma}
                      value={linha.method}
                      onChange={(e) =>
                        trocarForma(index, e.target.value as PaymentMethod)
                      }
                      error={erro("method")}
                    />
                    <MoneyInput
                      label="Valor"
                      value={linha.amount ?? ""}
                      onChange={(v) => atualizarLinha(index, { amount: v })}
                      error={erro("amount")}
                      required
                    />
                  </div>

                  {linha.method === PaymentMethod.CASH ? (
                    caixaAberto ? (
                      <p className="text-xs text-neutral-500">
                        Entra no caixa aberto ({sessao?.account.name}).
                      </p>
                    ) : (
                      <p
                        role="alert"
                        className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                      >
                        Abra o caixa para receber em dinheiro.
                      </p>
                    )
                  ) : (
                    <Select
                      label="Conta de destino"
                      options={opcoesConta}
                      value={linha.accountId ?? ""}
                      onChange={(e) =>
                        atualizarLinha(index, { accountId: e.target.value })
                      }
                      error={erro("accountId")}
                    />
                  )}

                  {linha.method === PaymentMethod.CREDIT_CARD && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Select
                        label="Parcelas"
                        options={Array.from({ length: max }, (_, i) => ({
                          value: i + 1,
                          label: `${i + 1}x`,
                        }))}
                        value={String(linha.installments ?? 1)}
                        onChange={(e) =>
                          atualizarLinha(index, {
                            installments: Number(e.target.value),
                          })
                        }
                        error={erro("installments")}
                      />
                      <Input
                        label="Bandeira"
                        placeholder="Ex.: Visa"
                        value={linha.cardBrand ?? ""}
                        onChange={(e) =>
                          atualizarLinha(index, { cardBrand: e.target.value })
                        }
                        error={erro("cardBrand")}
                      />
                    </div>
                  )}

                  {ehCartao && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="NSU"
                        value={linha.nsu ?? ""}
                        onChange={(e) =>
                          atualizarLinha(index, { nsu: e.target.value })
                        }
                        error={erro("nsu")}
                      />
                      <Input
                        label="Autorização"
                        value={linha.authorizationCode ?? ""}
                        onChange={(e) =>
                          atualizarLinha(index, {
                            authorizationCode: e.target.value,
                          })
                        }
                        error={erro("authorizationCode")}
                      />
                    </div>
                  )}

                  {linhas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerLinha(index)}
                      className="self-end inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline min-h-[36px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover forma
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {ativas.length > 1 && (
            <button
              type="button"
              onClick={adicionarLinha}
              className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline min-h-[36px]"
            >
              <Plus className="w-4 h-4" />
              Adicionar forma
            </button>
          )}

          <div
            data-testid="valor-restante"
            className={cn(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
              restanteCents < 0
                ? "bg-red-50 text-red-700"
                : "bg-neutral-50 text-neutral-700",
            )}
          >
            <span>{restanteCents < 0 ? "Excede o saldo em" : "Restante"}</span>
            <span>{formatMoney(centsToDecimal(Math.abs(restanteCents)))}</span>
          </div>
          {form.errors.lines && (
            <p role="alert" className="text-sm text-red-600">
              {form.errors.lines}
            </p>
          )}
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
            disabled={
              registrar.isPending || temDinheiroSemCaixa || ativas.length === 0
            }
            className="ds-btn-primary"
          >
            {registrar.isPending ? "Registrando..." : "Registrar pagamento"}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
