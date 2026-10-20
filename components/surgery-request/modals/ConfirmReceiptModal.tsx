"use client";

import React, { useState, useEffect, useRef } from "react";
import {
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
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { useEmailTags } from "@/hooks/useEmailTags";
import { EmailTagsInput } from "@/components/surgery-request/EmailTagsInput";
import { getTransitionBlockError } from "@/lib/http-error";
import { useZodForm } from "@/hooks/useZodForm";
import { Modal } from "@/components/ui/Modal";
import {
  buildReceiptPayload,
  contestPaymentFormSchema,
  receiptFormSchema,
  summarizeWorkflowFormErrors,
} from "@/lib/surgery-request-forms";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from "@/lib/file-upload";
import { applyBRLMask, parseBRLValue } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { todayISODate } from "@/lib/calendar-date";

const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png";
const ATTACHMENT_MAX_BYTES = MAX_DOCUMENT_FILE_SIZE_BYTES;
const INVALID_INPUT_CLASS = "border-red-400 focus:ring-red-400";

type Step = 1 | 2;

interface ConfirmReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
  initialReceivedValue?: number;
  isEditMode?: boolean;
}

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

export function ConfirmReceiptModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
  initialReceivedValue,
  isEditMode = false,
}: ConfirmReceiptModalProps) {
  const todayStr = todayISODate();

  const [step, setStep] = useState<Step>(1);

  const receiptForm = useZodForm({
    schema: receiptFormSchema,
    initialValues: { receivedValue: "", receivedAt: todayStr, receiptNotes: "" },
  });
  const contestForm = useZodForm({
    schema: contestPaymentFormSchema,
    initialValues: { to: [], subject: "", message: "" },
  });
  const { setField: setReceiptField } = receiptForm;
  const { setField: setContestField } = contestForm;

  useEffect(() => {
    if (isOpen && initialReceivedValue != null && initialReceivedValue > 0) {
      const cents = Math.round(initialReceivedValue * 100).toString();
      setReceiptField("receivedValue", applyBRLMask(cents));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const contestToState = useEmailTags({
    onChange: (tags) => setContestField("to", tags),
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [contestFile, setContestFile] = useState<File | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const contestFileRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const showFormErrors = (errors: Record<string, string>) =>
    showToast(summarizeWorkflowFormErrors(errors), "error");

  const handlePickFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (f: File | null) => void,
  ) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > ATTACHMENT_MAX_BYTES) {
      showToast(
        `Arquivo muito grande. O máximo permitido é ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`,
        "error",
      );
      return;
    }
    setter(f);
  };

  const uploadAttachment = async (file: File, key: string) => {
    try {
      await documentService.upload({
        surgeryRequestId: solicitacao.id,
        key,
        name: file.name,
        file,
        folder: DOCUMENT_FOLDERS.PRE_SURGERY,
      });
    } catch {
      showToast("O anexo não pôde ser enviado.", "error");
    }
  };

  const billing = solicitacao?.billing;
  const invoiceValue: number = Number(billing?.invoiceValue ?? 0);

  const { receivedValue } = receiptForm.values;
  const parsedReceivedValue = parseBRLValue(receivedValue);
  const valueIsValid =
    receivedValue.trim() !== "" &&
    !isNaN(parsedReceivedValue) &&
    parsedReceivedValue >= 0;
  const hasDivergence = valueIsValid && parsedReceivedValue !== invoiceValue;
  const valueDifference = valueIsValid ? invoiceValue - parsedReceivedValue : 0;

  const protocol = billing?.invoiceProtocol || "—";
  const invoiceValueStr = invoiceValue > 0 ? formatCurrency(invoiceValue) : "—";
  const sentAtStr = formatDate(billing?.invoiceSentAt);
  const expectedDate = formatExpectedDate(billing?.paymentDeadline);
  const alreadyReceivedValue: number | null =
    solicitacao?.receipt?.receivedValue ?? null;

  const handleClose = () => {
    if (isSaving) return;
    setStep(1);
    receiptForm.reset({ receivedAt: todayStr });
    contestToState.reset();
    contestForm.reset();
    setReceiptFile(null);
    setContestFile(null);
    onClose();
  };

  const handleConfirm = receiptForm.handleSubmit(async (data) => {
    const payload = buildReceiptPayload(data);
    setIsSaving(true);
    try {
      if (isEditMode) {
        await surgeryRequestService.updateReceipt(solicitacao.id, {
          receivedValue: payload.receivedValue,
          receivedAt: payload.receivedAt,
        });
        showToast("Recebimento atualizado com sucesso.", "success");
      } else {
        await surgeryRequestService.confirmReceipt(solicitacao.id, payload);
        showToast(
          "Recebimento confirmado! Status alterado para Finalizada.",
          "success",
        );
      }
      if (receiptFile)
        await uploadAttachment(receiptFile, "comprovante-recebimento");
      handleClose();
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ?? "Erro ao confirmar recebimento. Tente novamente.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, showFormErrors);

  const handleConfirmAndContest = receiptForm.handleSubmit((data) => {
    const received = buildReceiptPayload(data).receivedValue;
    contestForm.setValues({
      subject: `Recurso - Valor Faltante - Protocolo ${billing?.invoiceProtocol ?? ""}`,
      message: `Prezados,\n\nVenho por meio deste solicitar o pagamento do valor faltante referente ao protocolo ${billing?.invoiceProtocol ?? ""}.\n\nValor Faturado: ${formatCurrency(invoiceValue)}\nValor Recebido: ${formatCurrency(received)}\nValor Faltante: ${formatCurrency(Math.abs(invoiceValue - received))}\n\nAguardo retorno.\n\nAtenciosamente.`,
    });
    setStep(2);
  }, showFormErrors);

  const handleSubmitContest = contestForm.handleSubmit(async (contest) => {
    const receipt = receiptFormSchema.safeParse(receiptForm.values);
    if (!receipt.success) {
      setStep(1);
      return;
    }
    setIsSaving(true);
    try {
      await surgeryRequestService.confirmReceipt(
        solicitacao.id,
        buildReceiptPayload(receipt.data),
      );

      try {
        await surgeryRequestService.contestPayment(solicitacao.id, {
          to: contest.to.join(";"),
          subject: contest.subject,
          message: contest.message,
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

      if (contestFile)
        await uploadAttachment(contestFile, "documento-contestacao");
      handleClose();
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ?? "Erro ao confirmar recebimento. Tente novamente.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, showFormErrors);

  const modalTitle = (
    <span className="flex items-center gap-2.5 min-w-0">
      {step === 2 && (
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={isSaving}
          aria-label="Voltar"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100 transition-colors disabled:opacity-50 shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <span className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl bg-primary-50 shrink-0">
        <Receipt className="w-4 h-4 text-primary-700" />
      </span>
      <span className="min-w-0">
        <span className="block truncate">
          {step === 1 ? "Confirmar recebimento" : "Contestar recebimento"}
        </span>
        {step === 2 && (
          <span className="block text-xs font-normal text-neutral-400 leading-tight mt-0.5">
            Envie um e-mail de recurso ao convênio
          </span>
        )}
      </span>
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={isSaving}
      title={modalTitle}
      size="md"
      footer={
        step === 1 ? (
          <div className="flex items-center justify-end gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="ds-btn-outline disabled:opacity-50"
            >
              Cancelar
            </button>
            {hasDivergence && (
              <button
                type="button"
                onClick={() => void handleConfirmAndContest()}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar e recorrer
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSaving}
              className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Confirmando…" : "Confirmar"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-t border-neutral-100 shrink-0 bg-white">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={isSaving}
              className="ds-btn-outline disabled:opacity-50 hidden md:flex"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => void handleSubmitContest()}
              disabled={isSaving}
              className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 w-full md:w-auto justify-center"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSaving ? "Enviando…" : "Enviar recurso"}
            </button>
          </div>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4 md:gap-5 p-4 md:p-6">
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

          <div className="flex flex-col gap-3 md:gap-4">
            <p className="text-xs md:text-sm font-medium text-neutral-500">
              Informe os valores recebidos do convênio
            </p>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirm-receipt-value" className="ds-label mb-0">
                  Valor recebido
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  id="confirm-receipt-value"
                  name="receivedValue"
                  value={receivedValue}
                  onChange={(e) =>
                    setReceiptField(
                      "receivedValue",
                      applyBRLMask(e.target.value),
                    )
                  }
                  aria-invalid={Boolean(receiptForm.errors.receivedValue)}
                  placeholder="R$ 0,00"
                  disabled={isSaving}
                  className={`ds-input disabled:opacity-50 ${receiptForm.errors.receivedValue ? INVALID_INPUT_CLASS : ""}`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirm-receipt-date"
                  className="ds-label mb-0"
                >
                  Data do recebimento
                </label>
                <input
                  id="confirm-receipt-date"
                  type="date"
                  {...receiptForm.getFieldProps("receivedAt")}
                  disabled={isSaving}
                  aria-invalid={Boolean(receiptForm.errors.receivedAt)}
                  className={`ds-input disabled:opacity-50 ${receiptForm.errors.receivedAt ? INVALID_INPUT_CLASS : ""}`}
                />
              </div>
            </div>

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

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Observações{" "}
              <span className="font-normal text-neutral-400">
                (opcional)
              </span>
            </label>
            <textarea
              {...receiptForm.getFieldProps("receiptNotes")}
              placeholder="Ex: Recebido via transferência bancária, glosa parcial do procedimento…"
              rows={3}
              disabled={isSaving}
              className="ds-textarea disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-3.5 border border-dashed border-neutral-200 bg-neutral-50 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 rounded-lg shrink-0">
                <Paperclip className="w-4 h-4 text-neutral-500" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs md:text-sm font-medium text-neutral-700 truncate">
                  {receiptFile ? receiptFile.name : "Anexos"}
                </span>
                <span className="text-[10px] md:text-xs text-neutral-400">
                  PDF, JPG, PNG até {MAX_DOCUMENT_FILE_SIZE_MB}MB
                </span>
              </div>
            </div>
            <input
              ref={receiptFileRef}
              type="file"
              className="sr-only"
              accept={ATTACHMENT_ACCEPT}
              onChange={(e) => handlePickFile(e, setReceiptFile)}
              disabled={isSaving}
            />
            {receiptFile ? (
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50 shrink-0"
              >
                Remover
              </button>
            ) : (
              <button
                type="button"
                onClick={() => receiptFileRef.current?.click()}
                disabled={isSaving}
                className="ds-btn-outline disabled:opacity-50 shrink-0"
              >
                Selecionar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">De</label>
            <input
              type="text"
              value={
                process.env.NEXT_PUBLIC_MAIL_FROM_ADDRESS ||
                "no-reply@mg.inexci.com.br"
              }
              disabled
              readOnly
              className="ds-input disabled:bg-neutral-50 disabled:text-neutral-400 disabled:opacity-100 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Para</label>
            <p className="text-xs text-neutral-400 -mt-0.5">
              Digite um e-mail e pressione Enter para adicionar
            </p>
            <EmailTagsInput
              id="confirm-receipt-to-input"
              state={contestToState}
              variant="neutral"
              disabled={isSaving}
              invalid={Boolean(contestForm.errors.to)}
            />
            {contestForm.errors.to && (
              <p className="text-xs text-red-500">
                Informe pelo menos um destinatário
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Assunto</label>
            <input
              type="text"
              {...contestForm.getFieldProps("subject")}
              disabled={isSaving}
              aria-invalid={Boolean(contestForm.errors.subject)}
              className={`ds-input disabled:opacity-50 ${contestForm.errors.subject ? INVALID_INPUT_CLASS : ""}`}
            />
            {contestForm.errors.subject && (
              <p className="text-xs text-red-500">Preencha o assunto</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Mensagem</label>
            <textarea
              {...contestForm.getFieldProps("message")}
              rows={7}
              disabled={isSaving}
              aria-invalid={Boolean(contestForm.errors.message)}
              className={`ds-textarea disabled:opacity-50 ${contestForm.errors.message ? INVALID_INPUT_CLASS : ""}`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Documento de contestação
            </label>
            <div className="flex items-center justify-between gap-3 p-3.5 border border-dashed border-neutral-200 bg-neutral-50 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 flex items-center justify-center bg-white border border-neutral-200 rounded-lg shrink-0">
                  <Paperclip className="w-4 h-4 text-neutral-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs md:text-sm font-medium text-neutral-700 truncate">
                    {contestFile ? contestFile.name : "Anexar documento"}
                  </span>
                  <span className="text-[10px] md:text-xs text-neutral-400">
                    PDF, JPG, PNG até {MAX_DOCUMENT_FILE_SIZE_MB}MB
                  </span>
                </div>
              </div>
              <input
                ref={contestFileRef}
                type="file"
                className="sr-only"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => handlePickFile(e, setContestFile)}
                disabled={isSaving}
              />
              {contestFile ? (
                <button
                  type="button"
                  onClick={() => setContestFile(null)}
                  disabled={isSaving}
                  className="ds-btn-outline disabled:opacity-50 shrink-0"
                >
                  Remover
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => contestFileRef.current?.click()}
                  disabled={isSaving}
                  className="ds-btn-outline disabled:opacity-50 shrink-0"
                >
                  Selecionar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
