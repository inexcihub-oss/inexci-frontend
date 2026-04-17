"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Download, Mail, ExternalLink, CheckCircle } from "lucide-react";
import api from "@/lib/api";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { pendencyService } from "@/services/pendency.service";
import { useToast } from "@/hooks/useToast";
import { SurgeryRequestDocumentPreviewModal } from "@/components/laudo/SurgeryRequestDocumentPreviewModal";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
  notifyPatient?: boolean;
}

type Step = 1 | 2 | 3 | 4;
type SendMethod = "email" | "download" | null;

interface ChecklistItem {
  key: string;
  label: string;
  isComplete: boolean;
  isRequired: boolean;
}

export function SendRequestModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
  notifyPatient = false,
}: SendRequestModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [sendMethod, setSendMethod] = useState<SendMethod>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);

  // Email form state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailTags, setEmailTags] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailFormTouched, setEmailFormTouched] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const SEND_CHECKLIST_KEYS: Record<string, string> = {
    hospital: "Informações Gerais",
    tuss_procedures: "Código TUSS",
    opme_items: "OPME",
    medical_report: "Laudo",
  };

  useEffect(() => {
    if (isOpen && solicitacao?.id) {
      loadValidation();
      setCurrentStep(1);
      setSendMethod(null);
      setSaveAsTemplate(false);
      setTemplateName(
        `Modelo - ${solicitacao.patient?.name || "Solicitação"} - ${new Date().toLocaleDateString("pt-BR")}`,
      );
      setEmailSubject(
        `Solicitação Cirúrgica - ${solicitacao.patient?.name || "Paciente"}`,
      );
      setEmailMessage("");
      setEmailTags([]);
      setEmailInput("");
      setEmailFormTouched(false);
      setAttachments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, solicitacao?.id]);

  const loadValidation = async () => {
    setIsLoading(true);
    try {
      const result = await pendencyService.validate(solicitacao.id);
      if (result.pendencies && result.pendencies.length > 0) {
        const items: ChecklistItem[] = Object.entries(SEND_CHECKLIST_KEYS).map(
          ([key, label]) => {
            const found = result.pendencies.find((p) => p.key === key);
            let isComplete = found ? found.isComplete : false;
            if (!found && key === "hospital") {
              isComplete = !!(
                solicitacao.hospital_id || solicitacao.hospital?.id
              );
            }
            return {
              key,
              label,
              isComplete,
              isRequired: true,
            };
          },
        );
        setChecklist(items);
      } else {
        setChecklist([
          {
            key: "hospital",
            label: "Informações Gerais",
            isComplete: !!(solicitacao.hospital_id || solicitacao.hospital?.id),
            isRequired: true,
          },
          {
            key: "tuss_procedures",
            label: "Código TUSS",
            isComplete: !!(solicitacao.tuss_items?.length > 0),
            isRequired: true,
          },
          {
            key: "opme_items",
            label: "OPME",
            isComplete: !!(solicitacao.opme_items?.length > 0),
            isRequired: true,
          },
          {
            key: "medical_report",
            label: "Laudo",
            isComplete: !!solicitacao.medical_report,
            isRequired: true,
          },
        ]);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const canProceed = () =>
    checklist.every((item) => !item.isRequired || item.isComplete);

  const handleNext = async () => {
    if (currentStep === 1) {
      if (saveAsTemplate) {
        try {
          await surgeryRequestService.createTemplate({
            name:
              templateName.trim() ||
              `Modelo - ${solicitacao.patient?.name || "Solicitação"} - ${new Date().toLocaleDateString("pt-BR")}`,
            template_data: {
              procedures: solicitacao.tuss_items,
              opme_items: solicitacao.opme_items,
              hospital: solicitacao.hospital,
              hospital_id: solicitacao.hospital_id,
              health_plan: solicitacao.health_plan,
              health_plan_id: solicitacao.health_plan_id,
              medical_report: solicitacao.medical_report,
              required_documents: (solicitacao.documents || []).map(
                (d: any) => ({
                  type: d.type || d.document_type || "",
                  name: d.name || d.original_name || d.type || "",
                }),
              ),
            },
          });
          showToast("Modelo salvo com sucesso!", "success");
        } catch {
          showToast("Erro ao salvar modelo", "error");
        }
      }
      setCurrentStep(2);
    } else if (currentStep === 2 && sendMethod) {
      if (sendMethod === "download") {
        await handleDownload();
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      await handleSendEmail();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleDownload = async () => {
    setIsSending(true);
    try {
      const response = await api.post(
        `/surgery-requests/${solicitacao.id}/send`,
        { method: "download", notify_patient: notifyPatient },
      );
      const base64 = response.data?.pdf;
      if (!base64) throw new Error("PDF não gerado");
      // Decodifica base64 → Uint8Array → Blob
      const byteChars = atob(base64);
      const byteNums = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNums[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNums], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solicitacao-${solicitacao.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setCurrentStep(4);
    } catch {
      showToast("Erro ao baixar solicitação", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async () => {
    const recipients = emailTags.join(";");
    if (!recipients.trim() || !emailSubject.trim()) {
      setEmailFormTouched(true);
      return;
    }
    setIsSending(true);
    try {
      await surgeryRequestService.send(solicitacao.id, {
        method: "email",
        to: recipients,
        subject: emailSubject,
        message: emailMessage,
        notify_patient: notifyPatient,
      });
      setCurrentStep(4);
    } catch {
      showToast("Erro ao enviar solicitação", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      if (currentStep === 4) onSuccess();
      onClose();
    }
  };

  const addEmailTag = (email: string) => {
    const trimmed = email.trim().replace(/[;,]$/, "");
    if (trimmed && !emailTags.includes(trimmed)) {
      setEmailTags((prev) => [...prev, trimmed]);
    }
    setEmailInput("");
  };

  const removeEmailTag = (tag: string) => {
    setEmailTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ";" || e.key === ",") {
      e.preventDefault();
      if (emailInput.trim()) addEmailTag(emailInput);
    } else if (e.key === "Backspace" && !emailInput && emailTags.length > 0) {
      setEmailTags((prev) => prev.slice(0, -1));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- STEP RENDERS ----

  const renderStep1 = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700" />
          </div>
        ) : (
          <>
            {checklist.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-4 py-3 md:px-5 md:py-4 rounded-xl border border-gray-200"
              >
                <span className="flex-1 text-xs md:text-sm font-semibold text-gray-900">
                  {item.label}
                </span>
                <span
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs md:text-sm font-medium shrink-0 ${
                    item.isComplete
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-50 text-yellow-800"
                  }`}
                >
                  {item.isComplete ? "Completo" : "Incompleto"}
                </span>
              </div>
            ))}

            {/* Salvar como modelo */}
            <div className="flex flex-col gap-3 px-4 py-4 rounded-xl border border-gray-200 bg-gray-50">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 accent-teal-600 cursor-pointer"
                />
                <span className="text-xs md:text-sm font-semibold text-gray-900">
                  Salvar como modelo para reutilizar
                </span>
              </label>
              {saveAsTemplate && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">
                    Nome do modelo:
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Artroplastia padrão Unimed"
                    className="ds-input text-xs md:text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 p-6">
        <p className="text-xs md:text-sm text-gray-900">
          Como deseja enviar a solicitação?
        </p>

        <button
          type="button"
          onClick={() => setSendMethod("download")}
          className={`w-full flex items-start gap-4 p-6 rounded-xl border text-left transition-colors ${
            sendMethod === "download"
              ? "border-teal-500 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <Download className="w-5 h-5 shrink-0 text-gray-700 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs md:text-sm font-semibold text-gray-900">
              Download Manual
            </span>
            <span className="text-xs md:text-sm text-gray-400">
              Baixe um arquivo PDF contendo: Laudo médico, documentos, OPME e
              códigos TUSS
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSendMethod("email")}
          className={`w-full flex items-start gap-4 p-6 rounded-xl border text-left transition-colors ${
            sendMethod === "email"
              ? "border-teal-500 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <Mail className="w-5 h-5 shrink-0 text-gray-700 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs md:text-sm font-semibold text-gray-900">
              Enviar por e-mail
            </span>
            <span className="text-xs md:text-sm text-gray-400">
              Envie a solicitação diretamente para o convênio por e-mail
            </span>
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="flex flex-col gap-4 p-6">
        {/* De */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">De:</label>
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

        {/* Para */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Para:</label>
          <p className="text-xs text-gray-400">
            Digite um e-mail e pressione Enter para adicionar
          </p>
          <div
            className={`flex flex-wrap items-center gap-1 px-3 py-2 rounded-xl border bg-white min-h-10 cursor-text ${
              emailFormTouched && emailTags.length === 0
                ? "border-red-400"
                : "border-gray-200"
            }`}
            onClick={() => document.getElementById("send-email-input")?.focus()}
          >
            {emailTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs md:text-sm text-gray-900"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeEmailTag(tag)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              id="send-email-input"
              type="text"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleEmailKeyDown}
              onBlur={() => {
                if (emailInput.trim()) addEmailTag(emailInput);
              }}
              placeholder={
                emailTags.length === 0 ? "exemplo@mail.com" : undefined
              }
              className="flex-1 min-w-24 text-xs md:text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
            />
          </div>
          {emailFormTouched && emailTags.length === 0 && (
            <p className="text-xs text-red-500">
              Informe pelo menos um destinatário
            </p>
          )}
        </div>

        {/* Assunto */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Assunto:</label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => {
              setEmailSubject(e.target.value);
            }}
            className={`ds-input ${emailFormTouched && !emailSubject.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
          />
          {emailFormTouched && !emailSubject.trim() && (
            <p className="text-xs text-red-500">Preencha o assunto</p>
          )}
        </div>

        {/* Mensagem */}
        <div className="flex flex-col gap-1">
          <label className="ds-label mb-0">Mensagem:</label>
          <textarea
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            rows={4}
            placeholder="Digite sua mensagem..."
            className="ds-input resize-none"
          />
        </div>

        {/* Anexos */}
        <div className="flex flex-col gap-2">
          <label className="ds-label mb-0">Anexos</label>
          <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 border border-gray-200">
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </div>
              <span className="text-xs md:text-sm font-semibold text-gray-900">
                Anexos
              </span>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs md:text-sm text-gray-900 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              Selecionar arquivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-2 rounded-xl border border-gray-200 bg-white"
            >
              <span className="text-xs md:text-sm font-semibold text-gray-900">
                {file.name}{" "}
                <span className="text-gray-400 font-normal">
                  ({(file.size / 1024 / 1024).toFixed(1)}MB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(index)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-0">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-100">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg font-semibold text-gray-900 text-center">
          Solicitação enviada com sucesso!
        </span>
        <span className="text-xs md:text-sm text-gray-400 text-center">
          {sendMethod === "download"
            ? "Download iniciado automaticamente"
            : "E-mail enviado com sucesso"}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 w-full px-4 py-4 rounded-xl bg-blue-50">
        <span className="text-xs md:text-sm font-semibold text-purple-600">
          Status atualizado:
        </span>
        <span className="text-xs md:text-sm text-purple-500">
          {" "}
          A solicitação agora está com status &ldquo;
        </span>
        <span className="text-xs md:text-sm font-semibold text-purple-600">
          Enviado
        </span>
        <span className="text-xs md:text-sm text-purple-500">&rdquo;</span>
      </div>
    </div>
  );

  const renderFooter = () => {
    if (currentStep === 4) {
      return (
        <div className="px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200">
          <button onClick={handleClose} className="ds-btn-primary w-full">
            Fechar
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200">
        {currentStep === 2 ? (
          <button
            type="button"
            onClick={() => setIsDocumentPreviewOpen(true)}
            className="ds-btn-outline flex items-center justify-center gap-1.5 w-full sm:w-auto order-2 sm:order-1"
          >
            Visualizar documento
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        <div className="flex items-center gap-2 order-1 sm:order-2">
          <button
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="ds-btn-outline flex-1 sm:flex-none"
            disabled={isSending}
          >
            Cancelar
          </button>
          <button
            onClick={handleNext}
            disabled={
              (currentStep === 1 && (!canProceed() || isLoading)) ||
              (currentStep === 2 && !sendMethod) ||
              (currentStep === 3 && isSending) ||
              (currentStep !== 3 && isSending)
            }
            className="ds-btn-primary flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                {currentStep === 3 ? "Enviando..." : "Processando..."}
              </span>
            ) : currentStep === 3 ? (
              "Enviar e-mail"
            ) : (
              "Próximo"
            )}
          </button>
        </div>
      </div>
    );
  };

  const getTitle = () => {
    switch (currentStep) {
      case 1:
        return "Enviar Solicitação";
      case 2:
        return "Escolha o método de envio";
      case 3:
        return "Enviar por e-mail";
      case 4:
        return "Solicitação enviada";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={currentStep !== 4 ? handleClose : undefined}
      />
      <div className="relative bg-white rounded-2xl shadow-xl flex flex-col w-full max-w-[640px] h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 sm:px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 ds-modal-title">{getTitle()}</h2>
          {currentStep !== 4 && (
            <button
              onClick={handleClose}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 active:scale-[0.95] transition-all"
              disabled={isSending}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Footer */}
        <div className="shrink-0">{renderFooter()}</div>
      </div>

      {/* Document preview modal */}
      <SurgeryRequestDocumentPreviewModal
        isOpen={isDocumentPreviewOpen}
        onClose={() => setIsDocumentPreviewOpen(false)}
        solicitacao={solicitacao}
      />
    </div>
  );
}
