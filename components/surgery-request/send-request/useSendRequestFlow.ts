"use client";

import { useEffect, useState } from "react";
import {
  surgeryRequestService,
  type SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import {
  pendencyService,
  type ValidationResult,
} from "@/services/pendency.service";
import { useToast } from "@/hooks/useToast";
import { useEmailTags, type EmailTagsState } from "@/hooks/useEmailTags";
import { todayISODate } from "@/lib/calendar-date";
import {
  getApiErrorMessage,
  getBillingBlockError,
  getTransitionBlockError,
  type BillingBlockError,
} from "@/lib/http-error";
import { useAuth } from "@/contexts/AuthContext";
import {
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_FILE_SIZE_MB,
} from "@/lib/file-upload";
import {
  SC_CREATION_SOURCE_KEY,
  SEND_CHECKLIST_KEYS,
  parseLocalCalendarDate,
  type ChecklistItem,
  type SendMethod,
  type SendRequestStep,
} from "./types";

export interface UseSendRequestFlowParams {
  isOpen: boolean;
  solicitacao: SurgeryRequestDetail;
  onClose: () => void;
  onSuccess: () => void;
  initialValidation?: ValidationResult;
}

export interface SendRequestEmailState {
  subject: string;
  setSubject: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  to: EmailTagsState;
  cc: EmailTagsState;
  touched: boolean;
}

function defaultTemplateName(solicitacao: SurgeryRequestDetail): string {
  return `Modelo - ${solicitacao.patient?.name || "Solicitação"} - ${new Date().toLocaleDateString("pt-BR")}`;
}

function buildFallbackChecklist(
  solicitacao: SurgeryRequestDetail,
): ChecklistItem[] {
  return [
    {
      key: "hospital",
      label: "Informações Gerais",
      isComplete: !!(solicitacao.hospitalId || solicitacao.hospital?.id),
      isRequired: true,
    },
    {
      key: "tuss_procedures",
      label: "Código TUSS",
      isComplete: !!(solicitacao.tussItems?.length > 0),
      isRequired: true,
    },
    {
      key: "opme_items",
      label: "OPME",
      isComplete: !!(solicitacao.opmeItems?.length > 0),
      isRequired: true,
    },
    {
      key: "medical_report",
      label: "Laudo",
      isComplete: (solicitacao.sections?.length ?? 0) > 0,
      isRequired: true,
    },
  ];
}

export function buildChecklist(
  result: ValidationResult,
  solicitacao: SurgeryRequestDetail,
): ChecklistItem[] {
  if (!result.pendencies || result.pendencies.length === 0) {
    return buildFallbackChecklist(solicitacao);
  }
  return Object.entries(SEND_CHECKLIST_KEYS).map(([key, label]) => {
    const found = result.pendencies.find((p) => p.key === key);
    let isComplete = found ? found.isComplete : false;
    if (!found && key === "hospital") {
      isComplete = !!(solicitacao.hospitalId || solicitacao.hospital?.id);
    }
    return { key, label, isComplete, isRequired: true };
  });
}

export function useSendRequestFlow({
  isOpen,
  solicitacao,
  onClose,
  onSuccess,
  initialValidation,
}: UseSendRequestFlowParams) {
  const [currentStep, setCurrentStep] = useState<SendRequestStep>(1);
  const [sendMethod, setSendMethod] = useState<SendMethod>(null);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [billingBlock, setBillingBlock] = useState<BillingBlockError | null>(
    null,
  );

  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const emailTagsState = useEmailTags();
  const ccTagsState = useEmailTags();
  const [emailFormTouched, setEmailFormTouched] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const [sentAt, setSentAtState] = useState("");
  const [sentAtError, setSentAtError] = useState<string | null>(null);

  const { showToast } = useToast();
  const { refreshSubscription, blockReason, blockReasonCode } = useAuth();

  const sourceDocument = solicitacao.documents?.find(
    (doc) => doc.key === SC_CREATION_SOURCE_KEY && doc.uri,
  );
  const hasSourceDocument = !!sourceDocument;
  const usesSourceDocumentEmail = sendMethod === "email_source";

  const applyValidation = (result: ValidationResult) => {
    setChecklist(buildChecklist(result, solicitacao));
  };

  const loadValidation = async () => {
    setIsLoading(true);
    try {
      const result = await pendencyService.validate(solicitacao.id);
      applyValidation(result);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && solicitacao?.id) {
      if (initialValidation) {
        applyValidation(initialValidation);
      } else {
        loadValidation();
      }
      setCurrentStep(1);
      setSendMethod(null);
      setSaveAsTemplate(false);
      setTemplateName(defaultTemplateName(solicitacao));
      setEmailSubject(
        `Solicitação Cirúrgica - ${solicitacao.patient?.name || "Paciente"}`,
      );
      setEmailMessage("");
      emailTagsState.reset();
      setEmailFormTouched(false);
      setAttachments([]);
      ccTagsState.reset();
      setSentAtState(todayISODate());
      setSentAtError(null);
      setBillingBlock(
        blockReasonCode
          ? {
              reason: blockReasonCode,
              message: blockReason ?? "Assinatura não permite o envio.",
            }
          : null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, solicitacao?.id]);

  const canProceed = checklist.every(
    (item) => !item.isRequired || item.isComplete,
  );

  const saveTemplateIfRequested = async () => {
    if (!saveAsTemplate) return;

    try {
      await surgeryRequestService.createTemplate({
        name: templateName.trim() || defaultTemplateName(solicitacao),
        templateData: {
          procedure: solicitacao.procedure,
          tussItems: solicitacao.tussItems,
          opmeItems: solicitacao.opmeItems,
          hospital: solicitacao.hospital,
          healthPlan: solicitacao.healthPlan,
          priority: solicitacao.priority,
          requiredDocuments: (solicitacao.documents || []).map((d) => ({
            type: d.key || "",
            name: d.name || d.key || "",
          })),
        },
      });
      setSaveAsTemplate(false);
      showToast("Modelo salvo com sucesso!", "success");
    } catch {
      showToast("Erro ao salvar modelo", "error");
    }
  };

  const handleBillingError = (err: unknown): boolean => {
    const block = getBillingBlockError(err);
    if (!block) return false;
    setBillingBlock(block);
    void refreshSubscription();
    return true;
  };

  const handleDownload = async () => {
    setIsSending(true);
    try {
      await surgeryRequestService.send(solicitacao.id, { method: "download" });
      await refreshSubscription();

      const blob = await surgeryRequestService.exportPdf(solicitacao.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `solicitacao-${solicitacao.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      await saveTemplateIfRequested();
      setCurrentStep(4);
    } catch (err) {
      if (handleBillingError(err)) return;
      showToast(
        getTransitionBlockError(err) ??
          getApiErrorMessage(err, "Erro ao baixar solicitação"),
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmWithSourceDocument = async () => {
    const chosenDate = parseLocalCalendarDate(sentAt);
    if (!chosenDate) {
      setSentAtError("Informe a data em que a solicitação foi enviada.");
      return;
    }
    if (chosenDate.getTime() > Date.now()) {
      setSentAtError("A data de envio não pode estar no futuro.");
      return;
    }
    setSentAtError(null);

    setIsSending(true);
    try {
      await surgeryRequestService.send(solicitacao.id, {
        method: "document",
        sentAt,
      });
      await refreshSubscription();
      await saveTemplateIfRequested();
      setCurrentStep(4);
    } catch (err) {
      if (handleBillingError(err)) return;
      showToast(
        getTransitionBlockError(err) ??
          getApiErrorMessage(
            err,
            "Erro ao confirmar envio com documento de origem",
          ),
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSendEmail = async () => {
    const recipients = emailTagsState.tags.join(";");
    if (!recipients.trim() || !emailSubject.trim()) {
      setEmailFormTouched(true);
      const missing: string[] = [];
      if (!recipients.trim()) missing.push("Destinatários");
      if (!emailSubject.trim()) missing.push("Assunto");
      showToast(`Preencha: ${missing.join(", ")}`, "error");
      return;
    }
    setIsSending(true);
    try {
      await surgeryRequestService.send(solicitacao.id, {
        method: "email",
        to: recipients,
        subject: emailSubject,
        message: emailMessage,
        cc:
          ccTagsState.tags.length > 0 ? ccTagsState.tags.join(";") : undefined,
        ...(usesSourceDocumentEmail ? { useSourceDocument: true } : {}),
      });
      await refreshSubscription();
      await saveTemplateIfRequested();
      setCurrentStep(4);
    } catch (err) {
      if (handleBillingError(err)) return;
      showToast(
        getTransitionBlockError(err) ??
          getApiErrorMessage(err, "Erro ao enviar solicitação"),
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && sendMethod) {
      if (sendMethod === "download") {
        await handleDownload();
      } else if (sendMethod === "document") {
        setCurrentStep(3);
      } else {
        setCurrentStep(3);
        surgeryRequestService
          .getCcRecipients(solicitacao.id)
          .then((opts) => ccTagsState.setTags(opts.map((o) => o.email)))
          .catch(() => {});
      }
    } else if (currentStep === 3) {
      if (sendMethod === "document") {
        await handleConfirmWithSourceDocument();
      } else {
        await handleSendEmail();
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 2) setCurrentStep(1);
    else if (currentStep === 3) setCurrentStep(2);
  };

  const handleClose = () => {
    if (!isSending) {
      if (currentStep === 4) onSuccess();
      onClose();
    }
  };

  const dismissBillingBlock = () => {
    setBillingBlock(null);
    onClose();
  };

  const setSentAt = (value: string) => {
    setSentAtState(value);
    setSentAtError(null);
  };

  const addAttachments = (files: File[]) => {
    const valid = files.filter((f) => f.size <= MAX_DOCUMENT_FILE_SIZE_BYTES);
    const oversized = files.filter((f) => f.size > MAX_DOCUMENT_FILE_SIZE_BYTES);
    if (oversized.length > 0) {
      showToast(
        `${oversized.length} arquivo(s) ignorado(s): cada arquivo deve ter no máximo ${MAX_DOCUMENT_FILE_SIZE_MB}MB`,
        "error",
      );
    }
    if (valid.length > 0) {
      setAttachments((prev) => [...prev, ...valid]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const isNextDisabled =
    (currentStep === 1 && (!canProceed || isLoading)) ||
    (currentStep === 2 && !sendMethod) ||
    isSending;

  const title = (() => {
    switch (currentStep) {
      case 1:
        return "Enviar Solicitação";
      case 2:
        return "Escolha o método de envio";
      case 3:
        return sendMethod === "document"
          ? "Data de envio"
          : usesSourceDocumentEmail
            ? "Enviar documento de origem por e-mail"
            : "Enviar por e-mail";
      case 4:
        return "Solicitação enviada";
    }
  })();

  const email: SendRequestEmailState = {
    subject: emailSubject,
    setSubject: setEmailSubject,
    message: emailMessage,
    setMessage: setEmailMessage,
    to: emailTagsState,
    cc: ccTagsState,
    touched: emailFormTouched,
  };

  return {
    currentStep,
    title,
    sendMethod,
    setSendMethod,
    saveAsTemplate,
    setSaveAsTemplate,
    templateName,
    setTemplateName,
    isLoading,
    isSending,
    checklist,
    canProceed,
    isNextDisabled,
    billingBlock,
    dismissBillingBlock,
    sourceDocument,
    hasSourceDocument,
    usesSourceDocumentEmail,
    email,
    attachments,
    addAttachments,
    removeAttachment,
    sentAt,
    setSentAt,
    sentAtError,
    handleNext,
    handleBack,
    handleClose,
  };
}

export type SendRequestFlow = ReturnType<typeof useSendRequestFlow>;
