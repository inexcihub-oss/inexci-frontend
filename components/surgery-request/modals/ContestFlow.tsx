"use client";

import React, { useEffect } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { useEmailTags } from "@/hooks/useEmailTags";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { EmailTagsInput } from "@/components/surgery-request/EmailTagsInput";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from "@/lib/file-upload";

export type ContestStep = 1 | 2 | 3;
export type ContestMethod = "email" | "document";

export interface ContestFlowProps {
  step: ContestStep;
  reason: string;
  method: ContestMethod;
  emailForm: { to: string; subject: string; message: string; cc: string };
  attachments: File[];
  isSaving: boolean;
  surgeryRequestId: string | number;
  onReasonChange: (v: string) => void;
  onMethodChange: (v: ContestMethod) => void;
  onEmailChange: (field: "to" | "subject" | "message" | "cc", v: string) => void;
  onAttachmentsChange: (files: File[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function ContestFlow({
  step,
  reason,
  method,
  emailForm,
  attachments,
  isSaving,
  surgeryRequestId,
  onReasonChange,
  onMethodChange,
  onEmailChange,
  onAttachmentsChange,
  onNext,
  onBack,
  onSubmit,
}: ContestFlowProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [formTouched, setFormTouched] = React.useState(false);
  const toTags = useEmailTags({
    onChange: (tags) => onEmailChange("to", tags.join(";")),
  });
  const ccTags = useEmailTags({
    onChange: (tags) => onEmailChange("cc", tags.join(";")),
  });
  const setCcTags = ccTags.setTags;

  useEffect(() => {
    if (step === 3 && method === "email") {
      surgeryRequestService
        .getCcRecipients(surgeryRequestId)
        .then((opts) => setCcTags(opts.map((o) => o.email)))
        .catch(() => {});
    }
  }, [step, method, surgeryRequestId, setCcTags]);

  const canProceedStep1 = reason.trim().length > 0;
  const canSubmit =
    method === "email"
      ? toTags.tags.length > 0 && emailForm.subject.trim() !== ""
      : true;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const incoming = Array.from(e.target.files);
    const valid = incoming.filter(
      (f) => f.size <= MAX_DOCUMENT_FILE_SIZE_BYTES,
    );
    const oversized = incoming.filter(
      (f) => f.size > MAX_DOCUMENT_FILE_SIZE_BYTES,
    );
    if (oversized.length > 0) {
      showToast(
        `${oversized.length} arquivo(s) ignorado(s): cada arquivo deve ter no máximo ${MAX_DOCUMENT_FILE_SIZE_MB}MB`,
        "error",
      );
    }
    if (valid.length > 0) {
      onAttachmentsChange([...attachments, ...valid]);
    }
    e.target.value = "";
  };

  const removeAttachmentAt = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <>
      <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
        {step === 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">Motivo da contestação</label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Descreva detalhadamente o motivo da contestação..."
              rows={6}
              className="ds-textarea"
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3 md:gap-4">
            <p className="ds-body text-gray-600">
              Como deseja enviar a solicitação?
            </p>
            <div className="flex flex-col gap-3 md:gap-4">
              <button
                onClick={() => onMethodChange("document")}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-colors ${
                  method === "document"
                    ? "border-teal-500 bg-teal-50"
                    : "border-neutral-100 bg-white hover:border-neutral-200"
                }`}
              >
                <div className="shrink-0">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 3v13M12 16l-4-4M12 16l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="ds-section-title">Criar documento</span>
                  <span className="ds-caption mt-0.5">
                    Crie um arquivo PDF com contestação + anexos
                  </span>
                </div>
              </button>

              <button
                onClick={() => onMethodChange("email")}
                className={`flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition-colors ${
                  method === "email"
                    ? "border-teal-500 bg-teal-50"
                    : "border-neutral-100 bg-white hover:border-neutral-200"
                }`}
              >
                <div className="shrink-0">
                  <svg
                    className="w-6 h-6 text-gray-700"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="ds-section-title">Enviar por e-mail</span>
                  <span className="ds-caption mt-0.5">
                    Envie a contestação diretamente por e-mail
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && method === "email" && (
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">De:</label>
              <input
                type="text"
                value={
                  process.env.NEXT_PUBLIC_MAIL_FROM_ADDRESS ||
                  "no-reply@mg.inexci.com.br"
                }
                disabled
                readOnly
                className="ds-input disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100 cursor-not-allowed"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Para:</label>
              <p className="text-xs text-gray-400">
                Digite um e-mail e pressione Enter para adicionar
              </p>
              <EmailTagsInput
                id="contest-email-input-update"
                state={toTags}
                invalid={formTouched && toTags.tags.length === 0}
                borderClassName="border-neutral-100"
              />
              {formTouched && toTags.tags.length === 0 && (
                <p className="text-xs text-red-500">
                  Informe pelo menos um destinatário
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Cópia (CC):</label>
              <p className="text-xs text-gray-400">
                Digite um e-mail e pressione Enter para adicionar
              </p>
              <EmailTagsInput
                id="contest-cc-input-update"
                state={ccTags}
                invalid={false}
                borderClassName="border-neutral-100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Assunto:</label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => onEmailChange("subject", e.target.value)}
                placeholder="Contestação de autorizações - Maria Silva Santos"
                className={`ds-input ${formTouched && !emailForm.subject.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {formTouched && !emailForm.subject.trim() && (
                <p className="text-xs text-red-500">Preencha o assunto</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">
                Mensagem do corpo do e-mail:
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => onEmailChange("message", e.target.value)}
                placeholder="Digite a mensagem do corpo do e-mail..."
                rows={4}
                className="ds-textarea"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Documento de contestação</label>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
                <div className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-100 rounded-full shrink-0">
                  <svg
                    className="w-5 h-5 text-neutral-900"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate">
                  {attachments.length > 0
                    ? `${attachments.length} anexo(s) selecionado(s)`
                    : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn-outline"
                >
                  Selecionar arquivo
                </button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between text-xs text-neutral-600"
                    >
                      <span className="truncate pr-2">{file.name}</span>
                      <button
                        type="button"
                        className="text-neutral-500 hover:text-neutral-700"
                        onClick={() => removeAttachmentAt(index)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && method === "document" && (
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">
                Documento de contestação (opcional)
              </label>
              <p className="text-xs text-gray-500">
                Você pode gerar o PDF sem anexar documentos.
              </p>
              <div className="flex items-center gap-3 px-4 py-4 bg-neutral-50 border border-dashed border-neutral-100 rounded-xl">
                <div className="flex items-center justify-center w-10 h-10 bg-white border border-neutral-100 rounded-full shrink-0">
                  <svg
                    className="w-5 h-5 text-neutral-900"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <span className="flex-1 text-xs md:text-sm font-semibold text-neutral-900 truncate">
                  {attachments.length > 0
                    ? `${attachments.length} anexo(s) selecionado(s)`
                    : "Anexos"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ds-btn-outline"
                >
                  Selecionar arquivo
                </button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {attachments.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between text-xs text-neutral-600"
                    >
                      <span className="truncate pr-2">{file.name}</span>
                      <button
                        type="button"
                        className="text-neutral-500 hover:text-neutral-700"
                        onClick={() => removeAttachmentAt(index)}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ModalFooter align="end">
        <button onClick={onBack} className="ds-btn-outline">
          {step < 3 ? "Cancelar" : "Voltar"}
        </button>
        {step < 3 ? (
          <button
            onClick={onNext}
            disabled={step === 1 && !canProceedStep1}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        ) : (
          <button
            onClick={() => {
              if (!canSubmit) {
                setFormTouched(true);
                return;
              }
              onSubmit();
            }}
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving
              ? "Enviando..."
              : method === "email"
                ? "Enviar e-mail"
                : "Exportar PDF"}
          </button>
        )}
      </ModalFooter>
    </>
  );
}
