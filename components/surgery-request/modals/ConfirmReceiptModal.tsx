"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = 1 | 2;

interface ConfirmReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onSuccess: () => void;
  /** Valor numérico para pré-preencher o campo de valor recebido (usado ao editar contestação) */
  initialReceivedValue?: number;
  /** Quando true, chama updateReceipt (PATCH) em vez de confirmReceipt (POST) */
  isEditMode?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatExpectedDate(deadlineISO: string | null | undefined): string {
  if (!deadlineISO) return "—";
  const date = new Date(deadlineISO);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
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

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Modal "Confirmar Recebimento" — INVOICED (7) → FINALIZED (8).
 *
 * Etapa 1 (Confirmar recebimento):
 *   - Campos: valor recebido, data do recebimento, observações, anexos.
 *   - Valor OK → "Confirmar" habilitado com banner verde.
 *   - Valor divergente → banner amarelo + botão "Confirmar e recorrer".
 *
 * Etapa 2 (Contestar recebimento — ao clicar em "Confirmar e recorrer"):
 *   - Campos: De, Para, Assunto, Mensagem, Documento de contestação.
 *   - Footer: "Voltar" + "Enviar e-mail".
 *
 * Design: Figma nodes 1-1679 / 1-1714 / 1-1756 / 1-1929
 */
export function ConfirmReceiptModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
  initialReceivedValue,
  isEditMode = false,
}: ConfirmReceiptModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [step, setStep] = useState<Step>(1);

  // Etapa 1
  const [receivedValue, setReceivedValue] = useState("");

  // Pré-preenche o valor ao abrir com initialReceivedValue (edição de contestação)
  useEffect(() => {
    if (isOpen && initialReceivedValue != null && initialReceivedValue > 0) {
      const cents = Math.round(initialReceivedValue * 100).toString();
      setReceivedValue(applyBRLMask(cents));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  const [receivedAt, setReceivedAt] = useState(todayStr);
  const [receiptNotes, setReceiptNotes] = useState("");

  // Etapa 2
  const [contestFrom, setContestFrom] = useState("");
  const [contestTo, setContestTo] = useState("");
  const [contestSubject, setContestSubject] = useState("");
  const [contestMessage, setContestMessage] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  // ── Billing data ──
  const billing = solicitacao?.billing;
  const invoiceValue: number = Number(billing?.invoice_value ?? 0);

  const parsedReceivedValue = parseBRLValue(receivedValue);
  const valueIsValid =
    receivedValue.trim() !== "" &&
    !isNaN(parsedReceivedValue) &&
    parsedReceivedValue >= 0;
  const hasDivergence = valueIsValid && parsedReceivedValue !== invoiceValue;
  const valueDifference = valueIsValid ? invoiceValue - parsedReceivedValue : 0;

  const canProceedStep1 = valueIsValid && receivedAt !== "";
  const canSubmitContest =
    contestTo.trim() !== "" &&
    contestSubject.trim() !== "" &&
    contestMessage.trim() !== "";

  // ── Display values ──
  const protocol = billing?.invoice_protocol || "—";
  const invoiceValueStr = invoiceValue > 0 ? formatCurrency(invoiceValue) : "—";
  const sentAtStr = formatDate(billing?.invoice_sent_at);
  const expectedDate = formatExpectedDate(billing?.payment_deadline);
  const alreadyReceivedValue: number | null =
    solicitacao?.receipt?.received_value ?? null;

  const handleClose = () => {
    if (isSaving) return;
    setStep(1);
    setReceivedValue("");
    setReceivedAt(todayStr);
    setReceiptNotes("");
    setContestFrom("");
    setContestTo("");
    setContestSubject("");
    setContestMessage("");
    onClose();
  };

  // Confirma recebimento (novo ou edição de contestação)
  const handleConfirm = async () => {
    if (!canProceedStep1) return;
    setIsSaving(true);
    try {
      if (isEditMode) {
        await surgeryRequestService.updateReceipt(solicitacao.id, {
          received_value: parsedReceivedValue,
          received_at: new Date(receivedAt).toISOString(),
        });
        showToast("Recebimento atualizado com sucesso.", "success");
      } else {
        await surgeryRequestService.confirmReceipt(solicitacao.id, {
          received_value: parsedReceivedValue,
          received_at: new Date(receivedAt).toISOString(),
          receipt_notes: receiptNotes.trim() || undefined,
        });
        showToast(
          "Recebimento confirmado! Status alterado para Finalizada.",
          "success",
        );
      }
      handleClose();
      onSuccess();
    } catch {
      showToast("Erro ao confirmar recebimento. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Abre etapa de contestação
  const handleConfirmAndContest = () => {
    if (!canProceedStep1) return;
    setContestSubject(
      `Recurso - Valor Faltante - Protocolo ${billing?.invoice_protocol ?? ""}`,
    );
    setContestMessage(
      `Prezados,\n\nVenho por meio deste solicitar o pagamento do valor faltante referente ao protocolo ${billing?.invoice_protocol ?? ""}.\n\nValor Faturado: ${formatCurrency(invoiceValue)}\nValor Recebido: ${formatCurrency(parsedReceivedValue)}\nValor Faltante: ${formatCurrency(Math.abs(valueDifference))}\n\nAguardo retorno.\n\nAtenciosamente.`,
    );
    setStep(2);
  };

  // Confirma e envia contestação por e-mail
  const handleSubmitContest = async () => {
    if (!canSubmitContest) return;
    setIsSaving(true);
    try {
      // 1. Confirma o recebimento — muda status para Finalizada
      await surgeryRequestService.confirmReceipt(solicitacao.id, {
        received_value: parsedReceivedValue,
        received_at: new Date(receivedAt).toISOString(),
        receipt_notes: receiptNotes.trim() || undefined,
      });

      // 2. Tenta enviar o e-mail de contestação (falha não bloqueia o fluxo)
      try {
        await surgeryRequestService.contestPayment(solicitacao.id, {
          to: contestTo.trim(),
          subject: contestSubject.trim(),
          message: contestMessage.trim(),
        });
        showToast(
          "Recebimento confirmado e e-mail de contestação enviado.",
          "success",
        );
      } catch {
        showToast(
          "Recebimento confirmado, mas o e-mail não pôde ser enviado.",
          "error",
        );
      }

      handleClose();
      onSuccess();
    } catch {
      showToast("Erro ao confirmar recebimento. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden"
        style={{ height: "650px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 text-lg font-semibold text-gray-900">
            {step === 1 ? "Confirmar recebimento" : "Contestar recebimento"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Etapa 1: Confirmar recebimento ── */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-6 p-6 overflow-y-auto">
              {/* Billing info box */}
              <div className="flex flex-col gap-2 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-blue-600">
                  Dados do faturamento
                </p>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-blue-600">
                      Protocolo: {protocol}
                    </p>
                    <p className="text-sm text-blue-600">
                      Valor: {invoiceValueStr}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-sm text-blue-600">
                      Envio do faturamento : {sentAtStr}
                    </p>
                    <p className="text-sm text-blue-600">
                      Previsão: {expectedDate}
                    </p>
                  </div>
                  {alreadyReceivedValue != null && (
                    <p className="text-sm text-blue-600">
                      Valor já recebido: {formatCurrency(alreadyReceivedValue)}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-base text-gray-900">
                Confirme os valores recebidos do convênio
              </p>

              {/* Value + Date fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-black">
                    Valor recebido
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={receivedValue}
                    onChange={(e) =>
                      setReceivedValue(applyBRLMask(e.target.value))
                    }
                    placeholder="R$ 0,00"
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-black">
                    Data do recebimento
                  </label>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Value comparison alert */}
              {valueIsValid &&
                (hasDivergence ? (
                  <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-yellow-600 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-yellow-800">
                        Valor divergente! Faltam{" "}
                        {formatCurrency(Math.abs(valueDifference))}
                      </p>
                      <p className="text-sm text-yellow-800">
                        Você poderá enviar um recurso após confirmar o
                        recebimento.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 shrink-0 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-700">
                      Valor confere com o faturamento!
                    </p>
                  </div>
                ))}

              {/* Observations */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Observações sobre o Recebimento (Opcional)
                </label>
                <textarea
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Ex: Recebido via transferência bancária, glosa parcial do procedimento, etc."
                  rows={4}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-base text-gray-500 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50"
                />
              </div>

              {/* Attachments */}
              <div className="flex items-center justify-between gap-3 p-4 bg-gray-100 border border-dashed border-gray-300 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-100 border border-gray-200 rounded-full">
                    <Paperclip className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    Anexos
                  </span>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Selecionar arquivo
                </button>
              </div>
            </div>

            {/* Footer Etapa 1 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-gray-200 shrink-0">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="h-10 px-4 text-sm text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              {hasDivergence && (
                <button
                  onClick={handleConfirmAndContest}
                  disabled={!canProceedStep1 || isSaving}
                  className="h-10 px-4 text-sm font-semibold text-teal-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar e recorrer
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!canProceedStep1 || isSaving}
                className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </>
        )}

        {/* ── Etapa 2: Contestar recebimento ── */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">
              {/* De */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">De:</label>
                <input
                  type="email"
                  value={contestFrom}
                  onChange={(e) => setContestFrom(e.target.value)}
                  placeholder="inexci@mail.com"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>

              {/* Para */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Para:
                </label>
                <p className="text-sm text-gray-400">
                  Para incluir mais de um e-mail separe-os com ponto e vírgula
                  (;)
                </p>
                <input
                  type="text"
                  value={contestTo}
                  onChange={(e) => setContestTo(e.target.value)}
                  placeholder="autorizacoes@convenio.com.br"
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>

              {/* Assunto */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Assunto:
                </label>
                <input
                  type="text"
                  value={contestSubject}
                  onChange={(e) => setContestSubject(e.target.value)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                />
              </div>

              {/* Mensagem */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Mensagem
                </label>
                <textarea
                  value={contestMessage}
                  onChange={(e) => setContestMessage(e.target.value)}
                  rows={8}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-base text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none disabled:opacity-50"
                />
              </div>

              {/* Documento de contestação */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-black">
                  Documento de contestação
                </label>
                <div className="flex items-center justify-between gap-3 p-4 bg-gray-100 border border-dashed border-gray-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-100 border border-gray-200 rounded-full">
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      Anexos
                    </span>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    Selecionar arquivo
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Etapa 2 */}
            <div className="flex items-center justify-between px-6 py-4 border-t-2 border-gray-200 shrink-0">
              <button
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="h-10 px-4 text-sm text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmitContest}
                disabled={!canSubmitContest || isSaving}
                className="h-10 px-6 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Enviando..." : "Enviar e-mail"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
