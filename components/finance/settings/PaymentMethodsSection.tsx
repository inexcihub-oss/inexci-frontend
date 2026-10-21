"use client";

import { useEffect } from "react";
import { SectionCard, SectionCardBody } from "@/components/shared/SectionCard";
import {
  useFinancialAccounts,
  usePaymentMethodConfigs,
} from "@/hooks/useFinanceSettings";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useZodForm } from "@/hooks/useZodForm";
import { useToast } from "@/hooks/useToast";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/lib/http-error";
import {
  paymentMethodConfigSchema,
  type PaymentMethodConfigInput,
  type PaymentMethodConfigValues,
} from "@/lib/schemas/finance";
import {
  MAX_CREDIT_INSTALLMENTS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  PaymentMethod,
  type FinancialAccountDto,
  type PaymentMethodConfigDto,
} from "@/types/finance.types";

function valoresDe(config: PaymentMethodConfigDto): PaymentMethodConfigInput {
  return {
    method: config.method,
    active: config.active,
    defaultAccountId: config.defaultAccountId,
    maxInstallments: config.maxInstallments,
  };
}

function mudou(
  atual: PaymentMethodConfigInput,
  salvo: PaymentMethodConfigDto,
): boolean {
  return (
    atual.active !== salvo.active ||
    (atual.defaultAccountId ?? null) !== (salvo.defaultAccountId ?? null) ||
    Number(atual.maxInstallments) !== salvo.maxInstallments
  );
}

function PaymentMethodRow({
  config,
  accounts,
}: {
  config: PaymentMethodConfigDto;
  accounts: FinancialAccountDto[];
}) {
  const { showSuccess, showError } = useToast();
  const form = useZodForm({
    schema: paymentMethodConfigSchema,
    initialValues: valoresDe(config),
  });
  const { reset, values, errors, setField } = form;
  const label = PAYMENT_METHOD_LABELS[config.method];
  const credito = config.method === PaymentMethod.CREDIT_CARD;

  useEffect(() => {
    reset(valoresDe(config));
  }, [config, reset]);

  const salvar = useFinanceMutation(
    (data: PaymentMethodConfigValues) =>
      financeService.updatePaymentMethod(data.method, {
        active: data.active,
        defaultAccountId: data.defaultAccountId,
        maxInstallments: data.maxInstallments,
      }),
    {
      invalidate: [financeKeys.paymentMethods()],
      onSuccess: () => showSuccess(`${label}: configuração salva.`),
      onError: (error) =>
        showError(
          getApiErrorMessage(
            error,
            "Não foi possível salvar a forma de pagamento.",
          ),
        ),
    },
  );

  const contaAtualInativa =
    !!config.defaultAccountId &&
    !accounts.some((a) => a.id === config.defaultAccountId);

  const onSubmit = form.handleSubmit(async (data) => {
    await salvar.mutateAsync(data).catch(() => undefined);
  });

  return (
    <li className="grid grid-cols-2 gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_8rem_5.5rem] sm:items-start">
      <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:min-h-9 md:min-h-10">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <input
            type="checkbox"
            checked={!!values.active}
            onChange={(e) => setField("active", e.target.checked)}
            aria-label={`${label} ativa`}
            className="h-4 w-4 accent-teal-700"
          />
          {label}
        </label>
      </div>
      <div className="col-span-2 sm:col-span-1">
        <span className="mb-1 block text-xs text-gray-500 sm:hidden">
          Conta padrão
        </span>
        <select
          aria-label={`Conta padrão de ${label}`}
          value={values.defaultAccountId ?? ""}
          onChange={(e) => setField("defaultAccountId", e.target.value || null)}
          className="ds-input"
        >
          <option value="">Sem conta padrão</option>
          {contaAtualInativa && config.defaultAccount && (
            <option value={config.defaultAccount.id} disabled>
              {config.defaultAccount.name} (inativa)
            </option>
          )}
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        {errors.defaultAccountId && (
          <p className="mt-1 text-xs text-red-600">{errors.defaultAccountId}</p>
        )}
      </div>
      <div>
        <span className="mb-1 block text-xs text-gray-500 sm:hidden">
          Parcelas (máx.)
        </span>
        {credito ? (
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CREDIT_INSTALLMENTS}
            aria-label={`Parcelas de ${label}`}
            value={String(values.maxInstallments ?? "")}
            onChange={(e) =>
              setField(
                "maxInstallments",
                e.target.value === "" ? Number.NaN : Number(e.target.value),
              )
            }
            className="ds-input"
          />
        ) : (
          <span className="flex items-center text-sm text-gray-500 sm:min-h-9 md:min-h-10">
            À vista
          </span>
        )}
        {errors.maxInstallments && (
          <p className="mt-1 text-xs text-red-600">{errors.maxInstallments}</p>
        )}
      </div>
      <div className="flex items-end justify-end sm:min-h-9 sm:items-center md:min-h-10">
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={!mudou(values, config) || salvar.isPending}
          className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Salvar ${label}`}
        >
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </li>
  );
}

export function PaymentMethodsSection() {
  const configs = usePaymentMethodConfigs();
  const accounts = useFinancialAccounts();
  const ativas = (accounts.data ?? []).filter((a) => a.active);
  const ordenadas = [...(configs.data ?? [])].sort(
    (a, b) =>
      PAYMENT_METHODS.indexOf(a.method) - PAYMENT_METHODS.indexOf(b.method),
  );

  return (
    <SectionCard title="Formas de pagamento">
      <SectionCardBody>
        {configs.isLoading ? (
          <p className="text-sm text-gray-500">
            Carregando formas de pagamento...
          </p>
        ) : configs.isError ? (
          <p className="text-sm text-red-600">
            Não foi possível carregar as formas de pagamento.
          </p>
        ) : (
          <div>
            <div
              aria-hidden
              className="hidden gap-x-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_8rem_5.5rem]"
            >
              <span>Forma</span>
              <span>Conta padrão</span>
              <span className="whitespace-nowrap">Parcelas (máx.)</span>
              <span />
            </div>
            <ul
              aria-label="Formas de pagamento"
              className="divide-y divide-neutral-100 border-t border-neutral-100 sm:border-t-0"
            >
              {ordenadas.map((config) => (
                <PaymentMethodRow
                  key={config.method}
                  config={config}
                  accounts={ativas}
                />
              ))}
            </ul>
          </div>
        )}
      </SectionCardBody>
    </SectionCard>
  );
}
