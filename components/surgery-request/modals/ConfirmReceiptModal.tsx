"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Receipt,
  Calendar,
  Hash,
  Clock,
  ChevronLeft,
} from "lucide-react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Step = 1 | 2;

interface ConfirmReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
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

// Interpreta string de data YYYY-MM-DD como horário local (não UTC)
function parseDate(s: string): Date {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return parseDate(dateStr).toLocaleDateString("pt-BR");
}

function formatExpectedDate(deadlineISO: string | null | undefined): string {
  if (!deadlineISO) return "—";
  const date = parseDate(deadlineISO);
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
  const _td = new Date();
  const todayStr = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, "0")}-${String(_td.getDate()).padStart(2, "0")}`;

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
  const [contestToTags, setContestToTags] = useState<string[]>([]);
  const [contestToInput, setContestToInput] = useState("");
  const [contestFormTouched, setContestFormTouched] = useState(false);
  const [contestSubject, setContestSubject] = useState("");
  const [contestMessage, setContestMessage] = useState("");

  const addContestToTag = (email: string) => {
    const trimmed = email.trim().replace(/[;,]$/, "");
    if (trimmed && !contestToTags.includes(trimmed)) {
      setContestToTags((prev) => [...prev, trimmed]);
    }
    setContestToInput("");
  };

  const removeContestToTag = (tag: string) => {
    setContestToTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleContestToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (contestToInput.trim()) addContestToTag(contestToInput);
    } else if (
      e.key === "Backspace" &&
      !contestToInput &&
      contestToTags.length > 0
    ) {
      setContestToTags((prev) => prev.slice(0, -1));
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
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
    setContestToTags([]);
    setContestToInput("");
    setContestFormTouched(false);
    setContestSubject("");
    setContestMessage("");
    setAttempted(false);
    onClose();
  };

  // Confirma recebimento (novo ou edição de contestação)
  const handleConfirm = async () => {
    const missing: string[] = [];
    if (!receivedValue.trim() || !valueIsValid) missing.push("Valor recebido");
    if (!receivedAt) missing.push("Data do recebimento");
    if (missing.length > 0) {
      setAttempted(true);
      showToast(`Preencha: ${missing.join(", ")}`, "error");
      return;
    }
    setIsSaving(true);
    try {
      if (isEditMode) {
        await surgeryRequestService.updateReceipt(solicitacao.id, {
          received_value: parsedReceivedValue,
          received_at: parseDate(receivedAt).toISOString(),
        });
        showToast("Recebimento atualizado com sucesso.", "success");
      } else {
        await surgeryRequestService.confirmReceipt(solicitacao.id, {
          received_value: parsedReceivedValue,
          received_at: parseDate(receivedAt).toISOString(),
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
    const missing: string[] = [];
    if (!receivedValue.trim() || !valueIsValid) missing.push("Valor recebido");
    if (!receivedAt) missing.push("Data do recebimento");
    if (missing.length > 0) {
      setAttempted(true);
      showToast(`Preencha: ${missing.join(", ")}`, "error");
      return;
    }
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
    const missing: string[] = [];
    if (contestToTags.length === 0) missing.push("Destinatários");
    if (!contestSubject.trim()) missing.push("Assunto");
    if (!contestMessage.trim()) missing.push("Mensagem");
    if (missing.length > 0) {
      setContestFormTouched(true);
      showToast(`Preencha: ${missing.join(", ")}`, "error");
      return;
    }
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
          to: contestToTags.join(";"),
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

  const { dragY, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToClose(handleClose);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div
        className="relative bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full md:max-w-2xl md:mx-4 flex flex-col overflow-hidden max-h-[92dvh] md:max-h-[90vh] mobile-sheet-offset"
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
      >
        {/* Drag handle — apenas mobile */}
        <div
          className="flex md:hidden justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-neutral-100 shrink-0">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              disabled={isSaving}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors disabled:opacity-50 shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl bg-primary-50 shrink-0">
              <Receipt className="w-4 h-4 text-primary-700" />
            </div>
            <div className="min-w-0">
              <h2 className="ds-modal-title truncate">
                {step === 1 ? "Confirmar recebimento" : "Contestar recebimento"}
              </h2>
              {step === 2 && (
                <p className="text-xs text-neutral-400 leading-tight mt-0.5">
                  Envie um e-mail de recurso ao convênio
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Etapa 1: Confirmar recebimento ── */}
        {step === 1 && (
          <>
            <div className="flex flex-col gap-4 md:gap-5 p-4 md:p-6 overflow-y-auto">
              {/* Billing info card */}
              <div className="rounded-xl border border-primary-100 bg-primary-50/60">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary-100/70">
                  <Receipt className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                    Dados do faturamento
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-px bg-primary-100/50 text-xs md:text-sm">
                  <div className="flex flex-col gap-0.5 px-4 py-3 bg-primary-50/40">
                    <span className="text-[10px] md:text-xs font-medium text-primary-400 uppercase tracking-wide">
                      Protocolo
                    </span>
                    <span className="font-semibold text-primary-800 flex items-center gap-1.5">
                      <Hash className="w-3 h-3 shrink-0" />
                      {protocol}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 bg-primary-50/40">
                    <span className="text-[10px] md:text-xs font-medium text-primary-400 uppercase tracking-wide">
                      Valor faturado
                    </span>
                    <span className="font-semibold text-primary-800">
                      {invoiceValueStr}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 bg-primary-50/40">
                    <span className="text-[10px] md:text-xs font-medium text-primary-400 uppercase tracking-wide">
                      Envio
                    </span>
                    <span className="font-medium text-primary-700 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {sentAtStr}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 px-4 py-3 bg-primary-50/40">
                    <span className="text-[10px] md:text-xs font-medium text-primary-400 uppercase tracking-wide">
                      Previsão de pagamento
                    </span>
                    <span className="font-medium text-primary-700 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {expectedDate}
                    </span>
                  </div>
                  {alreadyReceivedValue != null && (
                    <div className="col-span-2 flex flex-col gap-0.5 px-4 py-3 bg-primary-50/40">
                      <span className="text-[10px] md:text-xs font-medium text-primary-400 uppercase tracking-wide">
                        Valor já recebido
                      </span>
                      <span className="font-semibold text-primary-800">
                        {formatCurrency(alreadyReceivedValue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Seção de confirmação */}
              <div className="flex flex-col gap-3 md:gap-4">
                <p className="text-xs md:text-sm font-medium text-neutral-500">
                  Informe os valores recebidos do convênio
                </p>

                {/* Value + Date fields */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="ds-label mb-0">Valor recebido</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={receivedValue}
                      onChange={(e) =>
                        setReceivedValue(applyBRLMask(e.target.value))
                      }
                      placeholder="R$ 0,00"
                      disabled={isSaving}
                      className={`ds-input disabled:opacity-50 ${attempted && (!receivedValue.trim() || !valueIsValid) ? "border-red-400 focus:ring-red-400" : ""}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="ds-label mb-0">Data do recebimento</label>
                    <input
                      type="date"
                      value={receivedAt}
                      onChange={(e) => setReceivedAt(e.target.value)}
                      disabled={isSaving}
                      className="ds-input disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Value comparison alert */}
                {valueIsValid &&
                  (hasDivergence ? (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 shrink-0">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="text-xs md:text-sm font-semibold text-amber-800">
                          Valor divergente — faltam{" "}
                          {formatCurrency(Math.abs(valueDifference))}
                        </p>
                        <p className="text-xs text-amber-700">
                          Você poderá enviar um recurso ao confirmar o
                          recebimento.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-xs md:text-sm font-semibold text-emerald-800">
                        Valor confere com o faturamento
                      </p>
                    </div>
                  ))}
              </div>

              {/* Observations */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">
                  Observações{" "}
                  <span className="font-normal text-neutral-400">
                    (opcional)
                  </span>
                </label>
                <textarea
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Ex: Recebido via transferência bancária, glosa parcial do procedimento…"
                  rows={3}
                  disabled={isSaving}
                  className="ds-textarea disabled:opacity-50"
                />
              </div>

              {/* Attachments */}
              <div className="flex items-center justify-between gap-3 p-3.5 border border-dashed border-neutral-200 bg-neutral-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 rounded-lg shrink-0">
                    <Paperclip className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs md:text-sm font-medium text-neutral-700">
                      Anexos
                    </span>
                    <span className="text-[10px] md:text-xs text-neutral-400">
                      PDF, JPG, PNG até 10MB
                    </span>
                  </div>
                </div>
                <button type="button" className="ds-btn-outline">
                  Selecionar
                </button>
              </div>
            </div>

            {/* Footer Etapa 1 */}
            <div className="flex items-center justify-end gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 shrink-0 bg-white">
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50"
              >
                Cancelar
              </button>
              {hasDivergence && (
                <button
                  onClick={handleConfirmAndContest}
                  disabled={isSaving}
                  className="ds-btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar e recorrer
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={isSaving}
                className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Confirmando…" : "Confirmar"}
              </button>
            </div>
          </>
        )}

        {/* ── Etapa 2: Contestar recebimento ── */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
              {/* De */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">De</label>
                <input
                  type="text"
                  value={
                    process.env.NEXT_PUBLIC_MAIL_FROM_ADDRESS ||
                    "noreply@inexci.com.br"
                  }
                  disabled
                  readOnly
                  className="ds-input disabled:bg-neutral-50 disabled:text-neutral-400 disabled:opacity-100 cursor-not-allowed"
                />
              </div>

              {/* Para */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">Para</label>
                <p className="text-xs text-neutral-400 -mt-0.5">
                  Digite um e-mail e pressione Enter para adicionar
                </p>
                <div
                  className={`flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl border bg-white min-h-[40px] cursor-text transition-colors ${
                    contestFormTouched && contestToTags.length === 0
                      ? "border-red-400"
                      : "border-neutral-100 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent"
                  }`}
                  onClick={() =>
                    document.getElementById("confirm-receipt-to-input")?.focus()
                  }
                >
                  {contestToTags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded-lg text-xs text-neutral-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeContestToTag(tag)}
                        disabled={isSaving}
                        className="text-neutral-400 hover:text-neutral-700 disabled:cursor-not-allowed"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    id="confirm-receipt-to-input"
                    type="text"
                    value={contestToInput}
                    onChange={(e) => setContestToInput(e.target.value)}
                    onKeyDown={handleContestToKeyDown}
                    onBlur={() => {
                      if (contestToInput.trim())
                        addContestToTag(contestToInput);
                    }}
                    placeholder={
                      contestToTags.length === 0
                        ? "exemplo@mail.com"
                        : undefined
                    }
                    disabled={isSaving}
                    className="flex-1 min-w-24 text-sm text-gray-900 outline-none bg-transparent placeholder-neutral-400 disabled:cursor-not-allowed"
                  />
                </div>
                {contestFormTouched && contestToTags.length === 0 && (
                  <p className="text-xs text-red-500">
                    Informe pelo menos um destinatário
                  </p>
                )}
              </div>

              {/* Assunto */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">Assunto</label>
                <input
                  type="text"
                  value={contestSubject}
                  onChange={(e) => setContestSubject(e.target.value)}
                  disabled={isSaving}
                  className={`ds-input disabled:opacity-50 ${contestFormTouched && !contestSubject.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
                />
                {contestFormTouched && !contestSubject.trim() && (
                  <p className="text-xs text-red-500">Preencha o assunto</p>
                )}
              </div>

              {/* Mensagem */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">Mensagem</label>
                <textarea
                  value={contestMessage}
                  onChange={(e) => setContestMessage(e.target.value)}
                  rows={7}
                  disabled={isSaving}
                  className="ds-textarea disabled:opacity-50"
                />
              </div>

              {/* Documento de contestação */}
              <div className="flex flex-col gap-1.5">
                <label className="ds-label mb-0">
                  Documento de contestação
                </label>
                <div className="flex items-center justify-between gap-3 p-3.5 border border-dashed border-neutral-200 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 rounded-lg shrink-0">
                      <Paperclip className="w-4 h-4 text-neutral-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs md:text-sm font-medium text-neutral-700">
                        Anexar documento
                      </span>
                      <span className="text-[10px] md:text-xs text-neutral-400">
                        PDF, JPG, PNG até 10MB
                      </span>
                    </div>
                  </div>
                  <button type="button" className="ds-btn-outline">
                    Selecionar
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Etapa 2 */}
            <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 shrink-0 bg-white">
              <button
                onClick={() => setStep(1)}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50 hidden md:flex"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmitContest}
                disabled={isSaving}
                className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 w-full md:w-auto justify-center"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Enviando…" : "Enviar recurso"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
