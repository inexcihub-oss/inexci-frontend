"use client";

import { EmailTagsInput } from "@/components/surgery-request/EmailTagsInput";
import { EmailAttachments } from "./EmailAttachments";
import type { SendRequestEmailState } from "./useSendRequestFlow";
import type { SendMethod } from "./types";

interface EmailStepProps {
  sendMethod: SendMethod;
  hasSourceDocument: boolean;
  sourceDocumentName?: string;
  email: SendRequestEmailState;
  attachments: File[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
}

export function EmailStep({
  sendMethod,
  hasSourceDocument,
  sourceDocumentName,
  email,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
}: EmailStepProps) {
  const missingRecipients = email.touched && email.to.tags.length === 0;
  const missingSubject = email.touched && !email.subject.trim();

  return (
    <div className="flex flex-col gap-4 p-6">
      {sendMethod === "email_source" && hasSourceDocument && (
        <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
          <p className="text-xs md:text-sm text-teal-900">
            O e-mail será enviado com o{" "}
            <span className="font-semibold">documento de origem</span> anexado:{" "}
            {sourceDocumentName}
          </p>
        </div>
      )}

      {sendMethod === "email" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs md:text-sm text-gray-700">
            O e-mail será enviado com o{" "}
            <span className="font-semibold">PDF gerado pela plataforma</span>{" "}
            (laudo, documentos, OPME e códigos TUSS).
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
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

      <div className="flex flex-col gap-1">
        <label className="ds-label mb-0">Para:</label>
        <p className="text-xs text-gray-400">
          Digite um e-mail e pressione Enter para adicionar
        </p>
        <EmailTagsInput
          id="send-email-input"
          state={email.to}
          invalid={missingRecipients}
        />
        {missingRecipients && (
          <p className="text-xs text-red-500">
            Informe pelo menos um destinatário
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="ds-label mb-0">Cópia (CC):</label>
        <p className="text-xs text-gray-400">
          Digite um e-mail e pressione Enter para adicionar
        </p>
        <EmailTagsInput id="send-cc-input" state={email.cc} invalid={false} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="ds-label mb-0">Assunto:</label>
        <input
          type="text"
          value={email.subject}
          onChange={(e) => email.setSubject(e.target.value)}
          className={`ds-input ${missingSubject ? "border-red-400 focus:ring-red-400" : ""}`}
        />
        {missingSubject && (
          <p className="text-xs text-red-500">Preencha o assunto</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="ds-label mb-0">Mensagem:</label>
        <textarea
          value={email.message}
          onChange={(e) => email.setMessage(e.target.value)}
          rows={4}
          placeholder="Digite sua mensagem..."
          className="ds-input resize-none"
        />
      </div>

      <EmailAttachments
        attachments={attachments}
        onAdd={onAddAttachments}
        onRemove={onRemoveAttachment}
      />
    </div>
  );
}
