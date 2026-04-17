"use client";

import React, { useState } from "react";
import { ModalFooter } from "@/components/shared/ModalFooter";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ContestStep = 1 | 2 | 3;
export type ContestMethod = "email" | "document";

export interface ContestEmailForm {
  to: string;
  subject: string;
  message: string;
}

export interface ContestFlowProps {
  step: ContestStep;
  reason: string;
  method: ContestMethod;
  emailForm: ContestEmailForm;
  isSaving: boolean;
  onReasonChange: (v: string) => void;
  onMethodChange: (v: ContestMethod) => void;
  onEmailChange: (field: keyof ContestEmailForm, v: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}

/**
 * Fluxo interno de contestação — usado em UpdateAuthorizationsModal (Etapa 3).
 * 3 partes:
 *   Parte 1: Motivo da contestação
 *   Parte 2: Escolha do método (E-mail ou Documento)
 *   Parte 3a: Formulário de e-mail
 *   Parte 3b: Confirmação de documento PDF
 *
 * Referências:
 *   - telas-inexci/status/em-analise/modal-autorizacao-contestar-parte-1.png
 *   - telas-inexci/status/em-analise/modal-autorizacao-contestar-parte-2.png
 *   - telas-inexci/status/em-analise/modal-autorizacao-contestar-parte-3-documento.png
 *   - telas-inexci/status/em-analise/modal-autorizacao-contestar-parte-3-email.png
 */
export function ContestFlow({
  step,
  reason,
  method,
  emailForm,
  isSaving,
  onReasonChange,
  onMethodChange,
  onEmailChange,
  onNext,
  onBack,
  onSubmit,
}: ContestFlowProps) {
  const [toTags, setToTags] = useState<string[]>([]);
  const [toInput, setToInput] = useState("");
  const [formTouched, setFormTouched] = useState(false);

  const addToTag = (email: string) => {
    const trimmed = email.trim().replace(/[;,]$/, "");
    if (trimmed && !toTags.includes(trimmed)) {
      const newTags = [...toTags, trimmed];
      setToTags(newTags);
      onEmailChange("to", newTags.join(";"));
    }
    setToInput("");
  };

  const removeToTag = (tag: string) => {
    const newTags = toTags.filter((t) => t !== tag);
    setToTags(newTags);
    onEmailChange("to", newTags.join(";"));
  };

  const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (toInput.trim()) addToTag(toInput);
    } else if (e.key === "Backspace" && !toInput && toTags.length > 0) {
      const newTags = toTags.slice(0, -1);
      setToTags(newTags);
      onEmailChange("to", newTags.join(";"));
    }
  };

  const canProceedStep1 = reason.trim().length > 0;
  const canSubmit =
    method === "email"
      ? toTags.length > 0 &&
        emailForm.subject.trim() !== "" &&
        emailForm.message.trim() !== ""
      : true;

  return (
    <>
      <div className="p-4 md:p-6 space-y-3 md:space-y-5">
        {/* Indicador de etapas */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500">
          {([1, 2, 3] as ContestStep[]).map((s) => (
            <React.Fragment key={s}>
              <span className={s === step ? "text-teal-700 font-semibold" : ""}>
                Etapa {s}
              </span>
              {s < 3 && <span>›</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Parte 1: Motivo */}
        {step === 1 && (
          <div className="space-y-1.5">
            <label className="block ds-label mb-0">
              Motivo da Contestação <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Descreva detalhadamente o motivo da contestação..."
              rows={5}
              className="ds-textarea"
            />
          </div>
        )}

        {/* Parte 2: Método */}
        {step === 2 && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-gray-600">
              Como deseja enviar a contestação?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["email", "document"] as ContestMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onMethodChange(m)}
                  className={`flex flex-col items-center justify-center gap-2 p-6 border-2 rounded-xl transition-colors ${
                    method === m
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {m === "email" ? (
                    <svg
                      className="w-8 h-8 text-teal-600"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M3 8L12 13L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-8 h-8 text-teal-600"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 3V21H19V7.828L14.172 3H5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 9H11M8 13H16M8 17H13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                  )}
                  <span className="text-xs md:text-sm font-semibold text-gray-900">
                    {m === "email" ? "Enviar E-mail" : "Criar Documento"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parte 3a: Formulário de e-mail */}
        {step === 3 && method === "email" && (
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-1.5">
              <label className="block ds-label mb-0">De:</label>
              <input
                type="text"
                value={
                  process.env.NEXT_PUBLIC_MAIL_FROM_ADDRESS ||
                  "noreply@inexci.com.br"
                }
                disabled
                readOnly
                className="ds-input disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-100 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block ds-label mb-0">
                Para <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400">
                Digite um e-mail e pressione Enter para adicionar
              </p>
              <div
                className={`flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border bg-white min-h-10 cursor-text ${
                  formTouched && toTags.length === 0
                    ? "border-red-400"
                    : "border-neutral-100"
                }`}
                onClick={() =>
                  document
                    .getElementById("contest-email-input-contest")
                    ?.focus()
                }
              >
                {toTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs md:text-sm text-gray-900"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeToTag(tag)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
                <input
                  id="contest-email-input-contest"
                  type="text"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={handleToKeyDown}
                  onBlur={() => {
                    if (toInput.trim()) addToTag(toInput);
                  }}
                  placeholder={
                    toTags.length === 0 ? "exemplo@mail.com" : undefined
                  }
                  className="flex-1 min-w-24 text-xs md:text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
                />
              </div>
              {formTouched && toTags.length === 0 && (
                <p className="text-xs text-red-500">
                  Informe pelo menos um destinatário
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block ds-label mb-0">
                Assunto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={emailForm.subject}
                onChange={(e) => onEmailChange("subject", e.target.value)}
                placeholder="Contestação de autorização"
                className={`ds-input ${formTouched && !emailForm.subject.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {formTouched && !emailForm.subject.trim() && (
                <p className="text-xs text-red-500">Preencha o assunto</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block ds-label mb-0">
                Mensagem <span className="text-red-500">*</span>
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => onEmailChange("message", e.target.value)}
                placeholder="Mensagem detalhada..."
                rows={5}
                className="ds-textarea"
              />
            </div>
          </div>
        )}

        {/* Parte 3b: Documento PDF */}
        {step === 3 && method === "document" && (
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs md:text-sm text-gray-600">
              Um documento PDF de contestação será gerado automaticamente com
              base no motivo informado e poderá ser baixado e enviado
              manualmente ao convênio.
            </p>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs md:text-sm font-medium text-gray-700">
                Motivo registrado:
              </p>
              <p className="text-xs md:text-sm text-gray-600 mt-1">{reason}</p>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        <button onClick={onBack} className="ds-btn-outline">
          Voltar
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
                ? "Enviar E-mail"
                : "Gerar Documento"}
          </button>
        )}
      </ModalFooter>
    </>
  );
}
