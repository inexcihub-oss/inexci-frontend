"use client";

import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, Mail, Download, FileText } from "lucide-react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { pendencyService, ValidationResult } from "@/services/pendency.service";
import { useToast } from "@/hooks/useToast";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;
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
}: SendRequestModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [sendMethod, setSendMethod] = useState<SendMethod>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Email form state
  const [emailForm, setEmailForm] = useState({
    sender: "",
    recipients: "",
    subject: "",
    message: "",
  });

  const { showToast } = useToast();

  // Load validation when modal opens
  useEffect(() => {
    if (isOpen && solicitacao?.id) {
      loadValidation();
      // Reset state
      setCurrentStep(1);
      setSendMethod(null);
      setSaveAsTemplate(false);
      setEmailForm({
        sender: "",
        recipients: "",
        subject: `Solicitação de Cirurgia - ${solicitacao.patient?.name || "Paciente"}`,
        message: "",
      });
    }
  }, [isOpen, solicitacao?.id]);

  const loadValidation = async () => {
    setIsLoading(true);
    try {
      const result = await pendencyService.validate(solicitacao.id);
      setValidation(result);

      // Build checklist from validation
      const items: ChecklistItem[] = [
        {
          key: "documents",
          label: "Documentos anexados",
          isComplete:
            solicitacao.documents && solicitacao.documents.length > 0,
          isRequired: true,
        },
        {
          key: "tuss",
          label: "Códigos TUSS preenchidos",
          isComplete:
            solicitacao.procedures && solicitacao.procedures.length > 0,
          isRequired: true,
        },
        {
          key: "opme",
          label: "OPME configurado",
          isComplete:
            solicitacao.opme_items && solicitacao.opme_items.length > 0,
          isRequired: false,
        },
        {
          key: "laudo",
          label: "Laudo médico preenchido",
          isComplete: !!solicitacao.medical_report,
          isRequired: true,
        },
      ];

      setChecklist(items);
    } catch (error) {
      console.error("Erro ao carregar validação:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const canProceed = () => {
    // Check if all required items are complete
    return checklist.every((item) => !item.isRequired || item.isComplete);
  };

  const handleNext = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && sendMethod) {
      if (sendMethod === "download") {
        handleDownload();
      } else {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleDownload = async () => {
    setIsSending(true);
    try {
      // Enviar solicitação para o backend
      await surgeryRequestService.send(solicitacao.id);
      showToast("Solicitação enviada com sucesso!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      showToast("Erro ao enviar solicitação", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailForm.recipients.trim()) {
      showToast("Informe pelo menos um destinatário", "error");
      return;
    }

    setIsSending(true);
    try {
      // Enviar solicitação para o backend
      await surgeryRequestService.send(solicitacao.id);
      showToast("Solicitação enviada com sucesso!", "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error);
      showToast("Erro ao enviar solicitação", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  // Step 1: Checklist
  const renderStep1 = () => (
    <div className="flex-1 p-6 space-y-4 overflow-auto">
      <p className="text-sm text-gray-600">
        Verifique se todos os itens obrigatórios estão preenchidos antes de
        enviar a solicitação.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.isComplete
                  ? "border-green-200 bg-green-50"
                  : item.isRequired
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  item.isComplete
                    ? "bg-green-500"
                    : item.isRequired
                      ? "bg-red-500"
                      : "bg-gray-300"
                }`}
              >
                {item.isComplete ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <X className="w-4 h-4 text-white" />
                )}
              </div>
              <span
                className={`flex-1 text-sm ${
                  item.isComplete
                    ? "text-green-700"
                    : item.isRequired
                      ? "text-red-700"
                      : "text-gray-600"
                }`}
              >
                {item.label}
                {!item.isRequired && (
                  <span className="text-gray-400 ml-1">(opcional)</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {!canProceed() && !isLoading && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Preencha todos os itens obrigatórios antes de continuar.
          </p>
        </div>
      )}

      {/* Checkbox salvar como template */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => setSaveAsTemplate(!saveAsTemplate)}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            saveAsTemplate
              ? "bg-teal-700 border-teal-700"
              : "bg-white border-gray-300"
          }`}
        >
          {saveAsTemplate && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="text-sm text-gray-700">
          Salvar como template para futuras solicitações
        </span>
      </div>
    </div>
  );

  // Step 2: Choose send method
  const renderStep2 = () => (
    <div className="flex-1 p-6 space-y-4 overflow-auto">
      <p className="text-sm text-gray-600">
        Escolha como deseja enviar a solicitação:
      </p>

      <div className="space-y-3">
        {/* Option: Email */}
        <button
          type="button"
          onClick={() => setSendMethod("email")}
          className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
            sendMethod === "email"
              ? "border-teal-500 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              sendMethod === "email" ? "bg-teal-100" : "bg-gray-100"
            }`}
          >
            <Mail
              className={`w-6 h-6 ${sendMethod === "email" ? "text-teal-600" : "text-gray-500"}`}
            />
          </div>
          <div className="flex-1 text-left">
            <p
              className={`font-semibold ${sendMethod === "email" ? "text-teal-700" : "text-gray-900"}`}
            >
              Enviar por E-mail
            </p>
            <p className="text-sm text-gray-500">
              Envie a solicitação diretamente para o convênio por e-mail
            </p>
          </div>
          {sendMethod === "email" && (
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </button>

        {/* Option: Download */}
        <button
          type="button"
          onClick={() => setSendMethod("download")}
          className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
            sendMethod === "download"
              ? "border-teal-500 bg-teal-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              sendMethod === "download" ? "bg-teal-100" : "bg-gray-100"
            }`}
          >
            <Download
              className={`w-6 h-6 ${sendMethod === "download" ? "text-teal-600" : "text-gray-500"}`}
            />
          </div>
          <div className="flex-1 text-left">
            <p
              className={`font-semibold ${sendMethod === "download" ? "text-teal-700" : "text-gray-900"}`}
            >
              Download Manual
            </p>
            <p className="text-sm text-gray-500">
              Baixe os documentos e envie manualmente pelo portal do convênio
            </p>
          </div>
          {sendMethod === "download" && (
            <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  // Step 3: Email form
  const renderStep3 = () => (
    <div className="flex-1 p-6 space-y-4 overflow-auto">
      <p className="text-sm text-gray-600">
        Configure os detalhes do e-mail para envio:
      </p>

      <div className="space-y-4">
        {/* Remetente */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Remetente
          </label>
          <input
            type="email"
            value={emailForm.sender}
            onChange={(e) =>
              setEmailForm({ ...emailForm, sender: e.target.value })
            }
            placeholder="seu@email.com"
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Destinatários */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Destinatários <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={emailForm.recipients}
            onChange={(e) =>
              setEmailForm({ ...emailForm, recipients: e.target.value })
            }
            placeholder="email1@convenio.com; email2@convenio.com"
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500">
            Separe múltiplos e-mails com ponto e vírgula (;)
          </p>
        </div>

        {/* Assunto */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Assunto
          </label>
          <input
            type="text"
            value={emailForm.subject}
            onChange={(e) =>
              setEmailForm({ ...emailForm, subject: e.target.value })
            }
            placeholder="Assunto do e-mail"
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Mensagem */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Mensagem
          </label>
          <textarea
            value={emailForm.message}
            onChange={(e) =>
              setEmailForm({ ...emailForm, message: e.target.value })
            }
            rows={5}
            placeholder="Escreva uma mensagem para acompanhar a solicitação..."
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
        </div>
      </div>
    </div>
  );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Verificar Solicitação";
      case 2:
        return "Método de Envio";
      case 3:
        return "Enviar por E-mail";
      default:
        return "Enviar Solicitação";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {getStepTitle()}
            </h2>
            <span className="text-sm text-gray-400">
              Etapa {currentStep} de 3
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={currentStep === 1 ? handleClose : handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSending}
          >
            {currentStep === 1 ? "Cancelar" : "Voltar"}
          </button>

          {currentStep === 1 && (
            <button
              onClick={handleNext}
              disabled={!canProceed() || isLoading}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          )}

          {currentStep === 2 && (
            <button
              onClick={handleNext}
              disabled={!sendMethod || isSending}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Enviando...
                </span>
              ) : sendMethod === "download" ? (
                "Enviar e Baixar"
              ) : (
                "Continuar"
              )}
            </button>
          )}

          {currentStep === 3 && (
            <button
              onClick={handleSendEmail}
              disabled={isSending}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Enviando...
                </span>
              ) : (
                "Enviar Solicitação"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
