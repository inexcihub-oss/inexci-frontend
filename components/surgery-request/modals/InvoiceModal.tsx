"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Loader2,
  User,
  Building2,
  Stethoscope,
  Calendar,
} from "lucide-react";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

function parseBRLValue(str: string): number {
  const cleaned = str
    .replace(/R\$\s?/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
}

function applyBRLMask(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits === "") return "";
  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const intRaw = padded.slice(0, -2).replace(/^0+/, "") || "0";
  const intFormatted = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${intFormatted},${cents}`;
}

/**
 * Modal "Faturamento de solicitação cirúrgica" — PERFORMED (6) → INVOICED (7).
 * Registra o faturamento enviado ao convênio.
 *
 * Design: Figma node 1-1537
 */
export function InvoiceModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: InvoiceModalProps) {
  const _td = new Date();
  const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, "0")}-${String(_td.getDate()).padStart(2, "0")}`;

  const [protocol, setProtocol] = useState("");
  const [sentAt, setSentAt] = useState(todayStr);
  const [value, setValue] = useState("");
  const [paymentDeadline, setPaymentDeadline] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { showToast } = useToast();

  // Pré-preenche o prazo de recebimento com o padrão do convênio ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const defaultDays = solicitacao?.health_plan?.default_payment_days;
      if (defaultDays) {
        setPaymentDeadline(String(defaultDays));
      }
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const healthPlanName = solicitacao?.health_plan?.name || "Convênio";
  const patientName = solicitacao?.patient?.name || "—";
  const procedureName = solicitacao?.procedure?.name || "—";

  const handleClose = () => {
    if (isSaving) return;
    setProtocol("");
    setSentAt(todayStr);
    setValue("");
    setPaymentDeadline("");
    setSetAsDefault(false);
    setAttempted(false);
    onClose();
  };

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(handleClose);

  const handleSubmit = async () => {
    const missing: string[] = [];
    if (!protocol.trim()) missing.push("Nº do protocolo");
    if (!sentAt) missing.push("Data de envio");
    if (!value.trim()) missing.push("Valor faturado");
    if (missing.length > 0) {
      setAttempted(true);
      showToast(`Preencha: ${missing.join(", ")}`, "error");
      return;
    }
    const numericValue = parseBRLValue(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setAttempted(true);
      showToast("Informe um valor válido.", "error");
      return;
    }
    setIsSaving(true);
    try {
      // Converte sentAt (YYYY-MM-DD de input) para data local sem shift UTC
      const [sy, sm, sd] = sentAt.split("-").map(Number);
      const sentAtDate = new Date(sy, sm - 1, sd);

      let paymentDeadlineISO: string | undefined;
      if (paymentDeadline && sentAt) {
        const deadlineDate = new Date(sy, sm - 1, sd);
        deadlineDate.setDate(
          deadlineDate.getDate() + parseInt(paymentDeadline, 10),
        );
        paymentDeadlineISO = deadlineDate.toISOString();
      }

      await surgeryRequestService.invoice(solicitacao.id, {
        invoice_protocol: protocol.trim(),
        invoice_value: numericValue,
        invoice_sent_at: sentAtDate.toISOString(),
        payment_deadline: paymentDeadlineISO,
        set_as_default_for_health_plan: setAsDefault || undefined,
      });
      showToast(
        "Faturamento registrado! Status alterado para Faturada.",
        "success",
      );
      handleClose();
      onSuccess();
    } catch {
      showToast("Erro ao registrar faturamento. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const isDragging = dragY > 0;
  const opacity = isDragging ? Math.max(0.2, 1 - dragY / 300) : 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        style={{ opacity }}
        onClick={handleClose}
      />

      <div
        className="relative bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:mx-4 flex flex-col max-h-[92dvh] md:max-h-[90vh] overflow-hidden mobile-sheet-offset"
        style={
          isDragging
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Drag handle — apenas mobile */}
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-neutral-100 shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="ds-modal-title truncate">Faturamento</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Solicitação cirúrgica · {patientName}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="ds-modal-body">
          {/* Info card */}
          <div className="rounded-xl border border-neutral-100">
            <div className="flex flex-col divide-y divide-neutral-100">
              {/* Mobile: label em cima, valor embaixo. Desktop: linha única */}
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

          {/* Form fields */}
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Row 1: Protocol + Sent date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">Nº do protocolo</label>
                <input
                  type="text"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  placeholder="Ex: 2024000123"
                  disabled={isSaving}
                  className={`ds-input text-xs md:text-sm disabled:opacity-50 ${attempted && !protocol.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
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

            {/* Row 2: Value + Payment deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">Valor faturado</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(applyBRLMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={isSaving}
                  className={`ds-input text-xs md:text-sm disabled:opacity-50 ${attempted && !value.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
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
          </div>

          {/* Save deadline as default */}
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

        {/* Footer */}
        <div className="ds-modal-footer shrink-0">
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
        </div>
      </div>
    </div>
  );
}
