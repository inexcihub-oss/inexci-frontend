"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { FinanceStatusBadge } from "@/components/finance/FinanceStatusBadge";
import { MoneyInput } from "@/components/finance/receivables/MoneyInput";
import {
  ReceivableDrawer,
  type ReceivableDrawerProps,
} from "@/components/finance/receivables/ReceivableDrawer";
import { useAppointmentFinanceStatus } from "@/hooks/useAppointmentFinanceStatus";
import { useFinanceMutation } from "@/hooks/useFinanceMutation";
import { useToast } from "@/hooks/useToast";
import { useZodForm } from "@/hooks/useZodForm";
import { financeService } from "@/services/finance.service";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/http-error";
import { decimalToBRLMask } from "@/lib/currency";
import { appointmentChargeSchema } from "@/lib/schemas/finance";
import {
  ReceivableStatus,
  type ReceivableDetailDto,
} from "@/types/finance.types";

export const CONSULTA_DE_CONVENIO = "CONSULTA_DE_CONVENIO";
export const CONSULTA_SEM_VALOR = "CONSULTA_SEM_VALOR";

const STATUS_SEM_COBRANCA = ["cancelled", "no_show"];

interface AppointmentFinanceActionsProps {
  appointmentId: string;
  appointmentStatus?: string;
  price?: string | null;
  hasHealthPlan: boolean;
  disabled?: boolean;
  renderPaymentActions?: ReceivableDrawerProps["renderPaymentActions"];
}

interface Cobranca {
  unitAmount: string;
  allowHealthPlan: boolean;
}

export function ehRecusaDeConvenio(error: unknown): boolean {
  return getApiErrorCode(error) === CONSULTA_DE_CONVENIO;
}

export function ehConsultaSemValor(error: unknown): boolean {
  return getApiErrorCode(error) === CONSULTA_SEM_VALOR;
}

const BOTAO =
  "px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold border border-teal-200 text-teal-700 bg-white hover:bg-teal-50 disabled:opacity-40 min-h-[44px] md:min-h-[36px]";

export function AppointmentFinanceActions({
  appointmentId,
  appointmentStatus,
  price,
  hasHealthPlan,
  disabled,
  renderPaymentActions,
}: AppointmentFinanceActionsProps) {
  const { showSuccess, showError } = useToast();
  const { status, isLoading, isError, isFetching, refetch } =
    useAppointmentFinanceStatus(appointmentId, true);
  const [drawer, setDrawer] = useState<{
    id: string;
    receber: boolean;
  } | null>(null);
  const [pedirValor, setPedirValor] = useState(false);
  const [confirmarConvenio, setConfirmarConvenio] = useState<{
    mensagem: string;
    unitAmount: string;
  } | null>(null);

  const form = useZodForm({
    schema: appointmentChargeSchema,
    initialValues: { unitAmount: "" },
  });
  const { reset } = form;
  const [erroDoValor, setErroDoValor] = useState<string | null>(null);

  useEffect(() => {
    if (pedirValor) reset({ unitAmount: decimalToBRLMask(price ?? "") });
  }, [pedirValor, price, reset]);

  const cobrar = useFinanceMutation<Cobranca, ReceivableDetailDto>(
    ({ unitAmount, allowHealthPlan }) =>
      financeService.createReceivableFromAppointment(appointmentId, {
        unitAmount,
        ...(allowHealthPlan ? { allowHealthPlan: true } : {}),
      }),
    {
      onSuccess: (criada) => {
        setPedirValor(false);
        setConfirmarConvenio(null);
        showSuccess("Cobrança criada.");
        setDrawer({ id: criada.id, receber: true });
      },
      onError: (error, { unitAmount, allowHealthPlan }) => {
        const mensagem = getApiErrorMessage(
          error,
          "Não foi possível criar a cobrança.",
        );
        if (!allowHealthPlan && ehRecusaDeConvenio(error)) {
          setPedirValor(false);
          setConfirmarConvenio({ mensagem, unitAmount });
          return;
        }
        if (ehConsultaSemValor(error)) {
          setConfirmarConvenio(null);
          setErroDoValor(mensagem);
          setPedirValor(true);
          return;
        }
        setConfirmarConvenio(null);
        showError(mensagem);
      },
    },
  );

  const onSubmitValor = form.handleSubmit(async (data) => {
    setErroDoValor(null);
    await cobrar
      .mutateAsync({ unitAmount: data.unitAmount, allowHealthPlan: false })
      .catch(() => undefined);
  });

  if (isLoading) return null;

  if (isError) {
    return (
      <div
        data-testid="consulta-financeiro"
        className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3"
      >
        <p role="alert" className="text-xs text-red-600">
          Não foi possível carregar o financeiro desta consulta.
        </p>
        <button
          type="button"
          disabled={isFetching}
          onClick={() => void refetch()}
          className={BOTAO}
        >
          {isFetching ? "Carregando..." : "Tentar novamente"}
        </button>
      </div>
    );
  }

  const emAberto =
    status?.status === ReceivableStatus.OPEN ||
    status?.status === ReceivableStatus.PARTIAL;
  const podeCobrar =
    !appointmentStatus || !STATUS_SEM_COBRANCA.includes(appointmentStatus);

  return (
    <div
      data-testid="consulta-financeiro"
      className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-neutral-600">
          Financeiro
        </span>
        {status ? (
          <FinanceStatusBadge status={status.status} />
        ) : (
          <span className="text-xs text-neutral-400">Sem cobrança</span>
        )}
      </div>
      {status ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setDrawer({ id: status.receivableId, receber: emAberto })
          }
          className={BOTAO}
        >
          {emAberto ? "Receber" : "Ver cobrança"}
        </button>
      ) : (
        podeCobrar && (
          <button
            type="button"
            disabled={disabled || cobrar.isPending}
            onClick={() => {
              setErroDoValor(null);
              setPedirValor(true);
            }}
            className={BOTAO}
          >
            {cobrar.isPending ? "Cobrando..." : "Cobrar"}
          </button>
        )
      )}

      <Modal
        isOpen={pedirValor}
        onClose={() => !cobrar.isPending && setPedirValor(false)}
        title="Cobrar consulta"
        size="sm"
        disableClose={cobrar.isPending}
      >
        <form onSubmit={onSubmitValor} noValidate>
          <div className="px-4 py-4 md:px-6 flex flex-col gap-3">
            <MoneyInput
              id="valor-da-consulta"
              label="Valor da consulta"
              required
              value={form.values.unitAmount ?? ""}
              onChange={(v) => {
                setErroDoValor(null);
                form.setField("unitAmount", v);
              }}
              error={form.errors.unitAmount ?? erroDoValor ?? undefined}
            />
            {hasHealthPlan && (
              <p className="text-xs text-neutral-500">
                Esta consulta é de convênio.
              </p>
            )}
          </div>
          <ModalFooter align="end">
            <button
              type="button"
              onClick={() => setPedirValor(false)}
              disabled={cobrar.isPending}
              className="ds-btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cobrar.isPending}
              className="ds-btn-primary"
            >
              {cobrar.isPending ? "Cobrando..." : "Criar cobrança"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      <Modal
        isOpen={!!confirmarConvenio}
        onClose={() => !cobrar.isPending && setConfirmarConvenio(null)}
        title="Consulta de convênio"
        size="sm"
        disableClose={cobrar.isPending}
      >
        <p className="px-4 py-4 md:px-6 text-sm text-neutral-700">
          {confirmarConvenio?.mensagem}
        </p>
        <ModalFooter align="end">
          <button
            type="button"
            onClick={() => setConfirmarConvenio(null)}
            disabled={cobrar.isPending}
            className="ds-btn-outline"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() =>
              confirmarConvenio &&
              cobrar.mutate({
                unitAmount: confirmarConvenio.unitAmount,
                allowHealthPlan: true,
              })
            }
            disabled={cobrar.isPending}
            className="ds-btn-primary"
          >
            Cobrar mesmo assim
          </button>
        </ModalFooter>
      </Modal>

      <ReceivableDrawer
        receivableId={drawer?.id ?? null}
        isOpen={!!drawer}
        openReceiveOnLoad={drawer?.receber ?? false}
        onClose={() => setDrawer(null)}
        renderPaymentActions={renderPaymentActions}
      />
    </div>
  );
}
