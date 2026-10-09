"use client";

import React from "react";
import { FileWarning, Paperclip } from "lucide-react";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
      />

      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col overflow-hidden pb-20 sm:pb-0">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        <div className="px-5 pt-5 pb-4 sm:pt-6 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <FileWarning className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="ds-modal-title">Termo de consentimento</h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1 leading-relaxed">
              Você não anexou o termo de consentimento assinado. Deseja anexar
              agora ou confirmar o agendamento mesmo assim?
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0"
            aria-label="Fechar"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-5 py-4 border-t border-neutral-100">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="ds-btn-outline disabled:opacity-50"
          >
            {isLoading ? "Confirmando..." : "Confirmar mesmo assim"}
          </button>
          <button
            onClick={onAttach}
            disabled={isLoading}
            className="ds-btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
            Anexar termo agora
          </button>
        </div>
      </div>
    </div>
  );
}
