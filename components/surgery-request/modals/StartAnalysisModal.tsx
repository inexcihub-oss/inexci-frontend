"use client";

import React, { useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { getTransitionBlockError } from "@/lib/http-error";
import { useZodForm } from "@/hooks/useZodForm";
import { Modal } from "@/components/ui/Modal";
import {
  buildStartAnalysisPayload,
  emptyQuotations,
  startAnalysisFormSchema,
  summarizeWorkflowFormErrors,
  type StartAnalysisFormValues,
} from "@/lib/surgery-request-forms";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
  DOCUMENT_FILE_TYPE_ERROR_MESSAGE,
  hasAllowedDocumentExtension,
} from "@/lib/file-upload";

const FILE_SIZE_ERROR_MESSAGE = `O arquivo deve ter no máximo ${MAX_DOCUMENT_FILE_SIZE_MB}MB.`;

interface StartAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string | number;
  onSuccess: () => void;
}

export function StartAnalysisModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: StartAnalysisModalProps) {
  const getToday = () => new Date().toISOString().split("T")[0];
  const today = getToday();
  const form = useZodForm({
    schema: startAnalysisFormSchema,
    initialValues: {
      requestNumber: "",
      receivedAt: today,
      quotations: emptyQuotations(),
      notes: "",
    },
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { values, errors } = form;

  const handleClose = () => {
    if (isSaving) return;
    form.reset({ receivedAt: getToday(), quotations: emptyQuotations() });
    setFile(null);
    setFileError(null);
    onClose();
  };

  const setQuotation = (
    index: number,
    patch: Partial<StartAnalysisFormValues["quotations"][number]>,
  ) => {
    form.setField(
      "quotations",
      values.quotations.map((quotation, i) =>
        i === index ? { ...quotation, ...patch } : quotation,
      ),
    );
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    if (!hasAllowedDocumentExtension(selected.name)) {
      setFileError(DOCUMENT_FILE_TYPE_ERROR_MESSAGE);
      return;
    }
    if (selected.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      setFileError(FILE_SIZE_ERROR_MESSAGE);
      return;
    }
    setFile(selected);
    setFileError(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSaving(true);
    try {
      if (file) {
        try {
          await documentService.upload({
            surgeryRequestId,
            key: "additional_document",
            name: file.name.replace(/\.[^/.]+$/, ""),
            file,
            folder: DOCUMENT_FOLDERS.PRE_SURGERY,
          });
        } catch {
          showToast(
            "Erro ao enviar o documento. Tente novamente.",
            "error",
          );
          return;
        }
      }

      const payload = buildStartAnalysisPayload(data);

      await surgeryRequestService.startAnalysis(surgeryRequestId, payload);
      showToast("Status atualizado para Em Análise", "success");
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ?? "Erro ao atualizar status. Tente novamente.",
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  }, (errs) => showToast(summarizeWorkflowFormErrors(errs), "error"));

  const inputClass = "ds-input disabled:opacity-50";

  const modalTitle = (
    <span className="flex items-center gap-3">
      <span className="flex md:hidden items-center justify-center w-9 h-9 rounded-xl bg-primary-50 shrink-0">
        <svg
          className="w-5 h-5 text-primary-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M9 12h6M9 16h4M17 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17 3v4h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block">Indicar análise</span>
        <span className="block md:hidden text-xs font-normal text-neutral-400 mt-0.5">
          Preencha os dados da solicitação
        </span>
      </span>
    </span>
  );

  const invalidClass = "border-red-400 focus:ring-red-400";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={isSaving}
      title={modalTitle}
      size="md"
      footer={
        <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-4 border-t border-neutral-100 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="ds-btn-outline disabled:opacity-50 flex-1 md:flex-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1 md:flex-none"
          >
            {isSaving ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Salvando...
              </span>
            ) : (
              "Atualizar status"
            )}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 p-5 md:gap-4 md:p-6">
        <div className="hidden md:flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-xl">
          <p className="text-sm md:text-base text-blue-600 leading-normal">
            Este protocolo corresponde ao número gerado pela operadora do
            convênio no momento em que a solicitação enviada pelo hospital foi
            recebida. Isso indica que o processo foi protocolado e encontra-se
            em análise pela operadora.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Dados da Solicitação
            </p>
          </div>

          <div className="bg-neutral-50 rounded-2xl p-4 flex flex-col gap-4 md:flex-row md:gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="start-analysis-request-number"
                className="ds-label mb-0 text-xs font-medium text-neutral-600"
              >
                <span className="text-red-500 mr-0.5">*</span>
                Nº da solicitação
              </label>
              <input
                id="start-analysis-request-number"
                type="text"
                {...form.getFieldProps("requestNumber")}
                placeholder="Ex: 0000000-0"
                disabled={isSaving}
                aria-invalid={Boolean(errors.requestNumber)}
                className={`${inputClass} ${errors.requestNumber ? invalidClass : ""}`}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1">
              <label
                htmlFor="start-analysis-received-at"
                className="ds-label mb-0 text-xs font-medium text-neutral-600"
              >
                <span className="text-red-500 mr-0.5">*</span>
                Data de recebimento
              </label>
              <input
                id="start-analysis-received-at"
                type="date"
                {...form.getFieldProps("receivedAt")}
                max={today}
                disabled={isSaving}
                aria-invalid={Boolean(errors.receivedAt)}
                className={`${inputClass} ${errors.receivedAt ? invalidClass : ""}`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Dados da cotação
              <span className="ml-1.5 text-neutral-400 normal-case font-normal tracking-normal">
                (opcional)
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {values.quotations.map((quotation, index) => (
              <div
                key={index}
                className="bg-neutral-50 rounded-2xl p-4 flex flex-col gap-3"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold">
                    {index + 1}
                  </span>
                  Proposta de cotação
                </span>
                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label
                      htmlFor={`start-analysis-quotation-${index}-number`}
                      className="ds-label mb-0 text-xs font-medium text-neutral-600"
                    >
                      Nº da proposta
                    </label>
                    <input
                      id={`start-analysis-quotation-${index}-number`}
                      type="text"
                      value={quotation.number}
                      onChange={(e) =>
                        setQuotation(index, { number: e.target.value })
                      }
                      placeholder="Ex: 0000000-0"
                      disabled={isSaving}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label
                      htmlFor={`start-analysis-quotation-${index}-received-at`}
                      className="ds-label mb-0 text-xs font-medium text-neutral-600"
                    >
                      Data de recebimento
                    </label>
                    <input
                      id={`start-analysis-quotation-${index}-received-at`}
                      type="date"
                      value={quotation.receivedAt}
                      onChange={(e) =>
                        setQuotation(index, { receivedAt: e.target.value })
                      }
                      disabled={isSaving}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="ds-label mb-0 text-xs font-medium text-neutral-600">
            Documento
            <span className="ml-1.5 text-neutral-400 normal-case font-normal tracking-normal">
              (opcional)
            </span>
          </label>
          {file ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3.5 py-2.5">
              <span className="flex items-center gap-2 min-w-0 text-sm text-neutral-900">
                <Paperclip className="w-4 h-4 text-neutral-400 shrink-0" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isSaving}
                className="text-neutral-400 hover:text-neutral-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSaving}
              className="w-full flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3.5 py-2.5 text-left text-sm text-neutral-500 hover:border-neutral-400 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4 text-neutral-400 shrink-0" />
              Anexar documento
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          {fileError && (
            <p className="text-xs text-red-600">{fileError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="ds-label mb-0 text-xs font-medium text-neutral-600">
            Observações
          </label>
          <textarea
            {...form.getFieldProps("notes")}
            placeholder="Digite sua observação..."
            disabled={isSaving}
            className="ds-textarea h-24 md:h-40 resize-none transition-colors disabled:opacity-50"
          />
        </div>
      </div>
    </Modal>
  );
}
