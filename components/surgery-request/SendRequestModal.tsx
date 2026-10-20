"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { SurgeryRequestDetail } from "@/services/surgery-request.service";
import type { ValidationResult } from "@/services/pendency.service";
import { Modal } from "@/components/ui/Modal";
import { BillingLimitModal } from "@/components/billing/BillingLimitModal";
import { SurgeryRequestDocumentPreviewModal } from "@/components/laudo/SurgeryRequestDocumentPreviewModal";
import { useSendRequestFlow } from "./send-request/useSendRequestFlow";
import { ChecklistStep } from "./send-request/ChecklistStep";
import { SendMethodStep } from "./send-request/SendMethodStep";
import { SentAtStep } from "./send-request/SentAtStep";
import { EmailStep } from "./send-request/EmailStep";
import { SendSuccessStep } from "./send-request/SendSuccessStep";
import { SendRequestFooter } from "./send-request/SendRequestFooter";

interface SendRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
  initialValidation?: ValidationResult;
}

export function SendRequestModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
  initialValidation,
}: SendRequestModalProps) {
  const [isDocumentPreviewOpen, setIsDocumentPreviewOpen] = useState(false);
  const flow = useSendRequestFlow({
    isOpen,
    solicitacao,
    onClose,
    onSuccess,
    initialValidation,
  });

  if (!isOpen) return null;

  if (flow.billingBlock) {
    return (
      <BillingLimitModal
        isOpen
        block={flow.billingBlock}
        onClose={flow.dismissBillingBlock}
      />
    );
  }

  const renderStep = () => {
    switch (flow.currentStep) {
      case 1:
        return (
          <ChecklistStep
            isLoading={flow.isLoading}
            checklist={flow.checklist}
            saveAsTemplate={flow.saveAsTemplate}
            onSaveAsTemplateChange={flow.setSaveAsTemplate}
            templateName={flow.templateName}
            onTemplateNameChange={flow.setTemplateName}
          />
        );
      case 2:
        return (
          <SendMethodStep
            sendMethod={flow.sendMethod}
            onSelect={flow.setSendMethod}
            hasSourceDocument={flow.hasSourceDocument}
            sourceDocumentName={flow.sourceDocument?.name}
          />
        );
      case 3:
        return flow.sendMethod === "document" ? (
          <SentAtStep
            sentAt={flow.sentAt}
            onSentAtChange={flow.setSentAt}
            error={flow.sentAtError}
          />
        ) : (
          <EmailStep
            sendMethod={flow.sendMethod}
            hasSourceDocument={flow.hasSourceDocument}
            sourceDocumentName={flow.sourceDocument?.name}
            email={flow.email}
            attachments={flow.attachments}
            onAddAttachments={flow.addAttachments}
            onRemoveAttachment={flow.removeAttachment}
          />
        );
      case 4:
        return <SendSuccessStep sendMethod={flow.sendMethod} />;
    }
  };

  return (
    <>
      <Modal
        isOpen
        onClose={flow.handleClose}
        title={flow.title}
        disableClose={flow.isSending || isDocumentPreviewOpen}
        footer={
          <SendRequestFooter
            currentStep={flow.currentStep}
            sendMethod={flow.sendMethod}
            isSending={flow.isSending}
            isNextDisabled={flow.isNextDisabled}
            onNext={flow.handleNext}
            onBack={flow.handleBack}
            onClose={flow.handleClose}
            onPreviewDocument={() => setIsDocumentPreviewOpen(true)}
          />
        }
      >
        {renderStep()}
      </Modal>

      {typeof document !== "undefined" &&
        createPortal(
          <SurgeryRequestDocumentPreviewModal
            isOpen={isDocumentPreviewOpen}
            onClose={() => setIsDocumentPreviewOpen(false)}
            solicitacao={solicitacao}
          />,
          document.body,
        )}
    </>
  );
}
