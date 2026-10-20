"use client";

import React, { useState, useEffect } from "react";
import { Loader2, User, Building2, Stethoscope, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import Input from "@/components/ui/Input";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage, getTransitionBlockError } from "@/lib/http-error";
import { applyBRLMask } from "@/lib/currency";
import { useZodForm } from "@/hooks/useZodForm";
import {
  buildInvoicePayload,
  invoiceFormSchema,
  summarizeWorkflowFormErrors,
} from "@/lib/surgery-request-forms";
import { todayISODate } from "@/lib/calendar-date";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

export function InvoiceModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: InvoiceModalProps) {
  const todayStr = todayISODate();

  const form = useZodForm({
    schema: invoiceFormSchema,
    initialValues: {
      protocol: "",
      sentAt: todayStr,
      value: "",
      notes: "",
      paymentDeadline: "",
      setAsDefault: false,
    },
  });
  const { protocol, sentAt, value, notes, paymentDeadline, setAsDefault } =
    form.values;
  const setProtocol = (v: string) => form.setField("protocol", v);
  const setSentAt = (v: string) => form.setField("sentAt", v);
  const setValue = (v: string) => form.setField("value", v);
  const setNotes = (v: string) => form.setField("notes", v);
  const setPaymentDeadline = (v: string) => form.setField("paymentDeadline", v);
  const setSetAsDefault = (v: boolean) => form.setField("setAsDefault", v);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const defaultDays = solicitacao?.healthPlan?.defaultPaymentDays;
      if (defaultDays) {
        setPaymentDeadline(String(defaultDays));
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const healthPlanName = solicitacao?.healthPlan?.name || "Convênio";
  const patientName = solicitacao?.patient?.name || "—";
  const procedureName = solicitacao?.procedure?.name || "—";

  const handleClose = () => {
    if (isSaving) return;
    form.reset({ sentAt: todayISODate() });
    onClose();
  };

  const handleSubmit = form.handleSubmit(
    async (data) => {
      setIsSaving(true);
      try {
        await surgeryRequestService.invoice(
          solicitacao.id,
          buildInvoicePayload(data),
        );
        showToast(
          "Faturamento registrado! Status alterado para Faturada.",
          "success",
        );
        setIsSaving(false);
        handleClose();
        onSuccess();
      } catch (err) {
        showToast(
          getTransitionBlockError(err) ??
            getApiErrorMessage(
              err,
              "Erro ao registrar faturamento. Tente novamente.",
            ),
          "error",
        );
      } finally {
        setIsSaving(false);
      }
    },
    (errors) => showToast(summarizeWorkflowFormErrors(errors), "error"),
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={isSaving}
      title={
        <span className="flex flex-col min-w-0">
          <span className="truncate">Faturamento</span>
          <span className="text-xs font-normal text-gray-400 mt-0.5 truncate">
            Solicitação cirúrgica · {patientName}
          </span>
        </span>
      }
      footer={
        <ModalFooter align="end">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="ds-btn-outline disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? "Salvando..." : "Concluir faturamento"}
          </button>
        </ModalFooter>
      }
    >
      <div className="ds-modal-body">
        <div className="rounded-xl border border-neutral-100">
          <div className="flex flex-col divide-y divide-neutral-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3.5 py-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide sm:w-20">
                  Paciente
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900 sm:truncate leading-snug">
                {patientName}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3.5 py-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide sm:w-20">
                  Convênio
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900 sm:truncate leading-snug">
                {healthPlanName}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 px-3.5 py-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide sm:w-20">
                  Procedimento
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-900 sm:truncate leading-snug">
                {procedureName}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-protocol" className="ds-label mb-0">
                Nº do protocolo
              </label>
              <Input
                id="invoice-protocol"
                type="text"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                placeholder="Ex: 2024000123"
                disabled={isSaving}
                className={`text-xs md:text-sm disabled:opacity-50 ${form.errors.protocol ? "border-red-400 focus:ring-red-400" : ""}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Data de envio</label>
              <div className="relative">
                <input
                  type="date"
                  value={sentAt}
                  onChange={(e) => setSentAt(e.target.value)}
                  disabled={isSaving}
                  className="ds-input pr-10 text-xs md:text-sm disabled:opacity-50 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="invoice-value" className="ds-label mb-0">
                Valor faturado
              </label>
              <Input
                id="invoice-value"
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(applyBRLMask(e.target.value))}
                placeholder="R$ 0,00"
                disabled={isSaving}
                className={`text-xs md:text-sm disabled:opacity-50 ${form.errors.value ? "border-red-400 focus:ring-red-400" : ""}`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">
                Prazo de recebimento
                <span className="ml-1 font-normal text-gray-400">(dias)</span>
              </label>
              <input
                type="number"
                min="0"
                value={paymentDeadline}
                onChange={(e) => setPaymentDeadline(e.target.value)}
                placeholder="Ex: 30"
                disabled={isSaving}
                className="ds-input text-xs md:text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Observação
              <span className="ml-1 font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: glosa parcial já discutida com o convênio"
              rows={4}
              disabled={isSaving}
              className="ds-input min-h-24 text-xs md:text-sm disabled:opacity-50 resize-y"
            />
          </div>
        </div>

        <label
          htmlFor="invoice-set-default"
          className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
            setAsDefault
              ? "bg-primary-50 border-primary-200"
              : "bg-neutral-50 border-neutral-100 hover:bg-gray-100"
          } ${!paymentDeadline || isSaving ? "opacity-50 cursor-default pointer-events-none" : ""}`}
        >
          <input
            type="checkbox"
            id="invoice-set-default"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
            disabled={isSaving || !paymentDeadline}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500 cursor-pointer disabled:cursor-default shrink-0"
          />
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-xs font-semibold text-gray-900 leading-tight">
              Salvar prazo como padrão para este convênio
            </span>
            <span className="text-xs text-gray-500 leading-snug">
              {paymentDeadline
                ? `${paymentDeadline} dias será aplicado automaticamente em novas solicitações da ${healthPlanName}`
                : `Informe o prazo acima para habilitar esta opção`}
            </span>
          </div>
        </label>
      </div>
    </Modal>
  );
}
