"use client";

import { ExternalLink } from "lucide-react";
import { ModalFooter, SpinnerButton } from "@/components/shared/ModalFooter";
import type { SendMethod, SendRequestStep } from "./types";

interface SendRequestFooterProps {
  currentStep: SendRequestStep;
  sendMethod: SendMethod;
  isSending: boolean;
  isNextDisabled: boolean;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
  onPreviewDocument: () => void;
}

function nextLabel(step: SendRequestStep, sendMethod: SendMethod): string {
  if (step !== 3) return "Próximo";
  return sendMethod === "document" ? "Confirmar envio" : "Enviar e-mail";
}

export function SendRequestFooter({
  currentStep,
  sendMethod,
  isSending,
  isNextDisabled,
  onNext,
  onBack,
  onClose,
  onPreviewDocument,
}: SendRequestFooterProps) {
  if (currentStep === 4) {
    return (
      <ModalFooter align="end">
        <button type="button" onClick={onClose} className="ds-btn-primary w-full">
          Fechar
        </button>
      </ModalFooter>
    );
  }

  return (
    <ModalFooter className="flex-col sm:flex-row items-stretch sm:items-center gap-2">
      {currentStep === 2 ? (
        <button
          type="button"
          onClick={onPreviewDocument}
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
          type="button"
          onClick={currentStep === 1 ? onClose : onBack}
          className="ds-btn-outline flex-1 sm:flex-none"
          disabled={isSending}
        >
          Cancelar
        </button>
        <SpinnerButton
          onClick={onNext}
          disabled={isNextDisabled}
          isLoading={isSending}
          loadingText={currentStep === 3 ? "Enviando..." : "Processando..."}
          className="flex-1 sm:flex-none"
        >
          {nextLabel(currentStep, sendMethod)}
        </SpinnerButton>
      </div>
    </ModalFooter>
  );
}
