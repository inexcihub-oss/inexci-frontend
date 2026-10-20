"use client";

import React from "react";
import { FileWarning, Paperclip } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";

interface ConsentTermWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onAttach: () => void;
  isLoading?: boolean;
}

export function ConsentTermWarningModal({
  isOpen,
  onClose,
  onConfirm,
  onAttach,
  isLoading = false,
}: ConsentTermWarningModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title="Termo de consentimento"
      size="sm"
      disableClose={isLoading}
    >
      <div className="px-5 pt-5 pb-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <FileWarning className="w-5 h-5 text-amber-600" />
        </div>
        <p className="flex-1 text-xs md:text-sm text-gray-500 leading-relaxed">
          Você não anexou o termo de consentimento assinado. Deseja anexar agora
          ou confirmar o agendamento mesmo assim?
        </p>
      </div>

      <ModalFooter align="end" className="flex-col-reverse sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="ds-btn-outline disabled:opacity-50"
        >
          {isLoading ? "Confirmando..." : "Confirmar mesmo assim"}
        </button>
        <button
          type="button"
          onClick={onAttach}
          disabled={isLoading}
          className="ds-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Paperclip className="w-4 h-4" />
          Anexar termo agora
        </button>
      </ModalFooter>
    </Modal>
  );
}
