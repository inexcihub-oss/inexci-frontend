"use client";

import React, { useState } from "react";
import { X, Calendar, Loader2 } from "lucide-react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
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
  const { showToast } = useToast();

  const canSubmit =
    protocol.trim() !== "" && sentAt !== "" && value.trim() !== "";

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
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const numericValue = parseBRLValue(value);
    if (isNaN(numericValue) || numericValue <= 0) {
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
      } as any);
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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 text-2xl font-light tracking-tight text-gray-900">
            Faturamento de solicitação cirúrgica
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
          {/* Info box */}
          <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm font-semibold text-blue-600">
              Informações da solicitação
            </p>
            <p className="text-sm text-blue-600">
              Paciente: {patientName} · Convênio: {healthPlanName} ·
              Procedimento: {procedureName}
            </p>
          </div>

          <p className="text-sm md:text-base text-gray-900">
            Preencha os dados para concluir o faturamento
          </p>

          {/* Form fields */}
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Row 1: Protocol + Sent date */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">
                  Nº do protocolo de faturamento
                </label>
                <input
                  type="text"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  placeholder="Protocolo"
                  disabled={isSaving}
                  className="ds-input disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Envio do faturamento</label>
                <div className="relative">
                  <input
                    type="date"
                    value={sentAt}
                    onChange={(e) => setSentAt(e.target.value)}
                    disabled={isSaving}
                    className="ds-input pr-10 disabled:opacity-50"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Value + Payment deadline */}
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Valor</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(applyBRLMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={isSaving}
                  className="ds-input disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">
                  Prazo para recebimento (dias)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  placeholder="Ex.30 dias"
                  disabled={isSaving}
                  className="ds-input disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Save deadline as default */}
          <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-xl">
            <input
              type="checkbox"
              id="invoice-set-default"
              checked={setAsDefault}
              onChange={(e) => setSetAsDefault(e.target.checked)}
              disabled={isSaving || !paymentDeadline}
              className="mt-0.5 w-4 h-4 border-gray-300 rounded text-teal-700 focus:ring-teal-500 cursor-pointer disabled:cursor-default"
            />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="invoice-set-default"
                className="ds-label mb-0 cursor-pointer"
              >
                Salvar prazo como padrão para este convênio?
              </label>
              <p className="text-sm text-gray-500">
                O prazo de {paymentDeadline || "[x]"} dias será usado
                automáticamente para futuras solicitações da {healthPlanName}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200 shrink-0">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="ds-btn-outline disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
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
