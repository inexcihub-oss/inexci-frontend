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
  const todayStr = new Date().toISOString().split("T")[0];

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
  const procedureName = solicitacao?.procedures?.[0]?.procedure?.name || "—";

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
      let paymentDeadlineISO: string | undefined;
      if (paymentDeadline && sentAt) {
        const deadlineDate = new Date(sentAt);
        deadlineDate.setDate(
          deadlineDate.getDate() + parseInt(paymentDeadline, 10),
        );
        paymentDeadlineISO = deadlineDate.toISOString();
      }

      await surgeryRequestService.invoice(solicitacao.id, {
        invoice_protocol: protocol.trim(),
        invoice_value: numericValue,
        invoice_sent_at: new Date(sentAt).toISOString(),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200 shrink-0">
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
        <div className="flex flex-col gap-6 p-6 overflow-y-auto">
          {/* Info box */}
          <div className="flex flex-col gap-1 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-600">
              Informações da solicitação
            </p>
            <p className="text-sm text-blue-600">
              Paciente: {patientName} · Convênio: {healthPlanName} ·
              Procedimento: {procedureName}
            </p>
          </div>

          <p className="text-base text-gray-900">
            Preencha os dados para concluir o faturamento
          </p>

          {/* Form fields */}
          <div className="flex flex-col gap-6">
            {/* Row 1: Protocol + Sent date */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Nº do protocolo de faturamento
                </label>
                <input
                  type="text"
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  placeholder="Protocolo"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Envio do faturamento
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={sentAt}
                    onChange={(e) => setSentAt(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 pr-10 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 2: Value + Payment deadline */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Valor
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(applyBRLMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Prazo para recebimento (dias)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                  placeholder="Ex.30 dias"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Save deadline as default */}
          <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-lg">
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
                className="text-sm font-semibold text-gray-900 cursor-pointer"
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-gray-200 shrink-0">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="h-10 px-4 text-sm text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? "Salvando..." : "Concluir faturamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
