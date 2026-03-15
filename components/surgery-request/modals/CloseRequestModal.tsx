"use client";

import React, { useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";

import { useToast } from "@/hooks/useToast";

interface CloseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string;
  onSuccess: () => void;
}

/**
 * Modal de confirmação de encerramento de solicitação.
 * Disponível para status 1 a 7 (qualquer status exceto Finalizada e Encerrada).
 *
 * Pode ser aberto de múltiplos pontos:
 * - Botão "Encerrar" na tela de detalhes
 * - Botão "Encerrar Solicitação" na Etapa 3 do UpdateAuthorizationsModal
 * - Opção "Cancelada" no SurgeryStatusModal
 *
 * Referência: telas-inexci/status/em-analise/modal-autorizacao-encerrar.png
 */
export function CloseRequestModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: CloseRequestModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const { showToast } = useToast();

  const handleClose = () => {
    if (isClosing) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await surgeryRequestService.close(surgeryRequestId);
      showToast("Solicitação encerrada com sucesso", "success");
      onSuccess();
    } catch {
      showToast("Erro ao encerrar solicitação", "error");
    } finally {
      setIsClosing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-2.5 px-6 py-4 border-b border-neutral-100">
          <h2 className="flex-1 text-2xl font-light tracking-tight text-neutral-900">
            Deseja encerrar a solicitação?
          </h2>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-base text-neutral-900 leading-relaxed">
            Essa solicitação será encerrada e movida para o status
            &ldquo;Encerrada&rdquo; como incompleta.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100">
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="h-10 px-4 text-sm text-neutral-900 bg-white border border-neutral-100 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isClosing}
            className="h-10 px-6 text-sm font-semibold bg-priority-urgente-bg text-priority-urgente-text rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isClosing ? "Encerrando..." : "Encerrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
