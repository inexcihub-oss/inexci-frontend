"use client";

import React, { useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface UpdateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onSuccess: () => void;
}

/**
 * Modal "Editar Recebimento" — FINALIZED (8), sem mudança de status.
 * Permite editar o valor e data do recebimento após contestação.
 *
 * Referência visual:
 *   telas-inexci/status/finalizada/modal-confirmar-recebimento-botao-editar-aba-faturamento.png
 */
export function UpdateReceiptModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: UpdateReceiptModalProps) {
  const receipt = solicitacao?.receipt;

  const [receivedValue, setReceivedValue] = useState<string>(
    receipt?.received_value != null ? String(receipt.received_value) : "",
  );
  const [receivedAt, setReceivedAt] = useState<string>(
    receipt?.received_at
      ? new Date(receipt.received_at).toISOString().split("T")[0]
      : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setReceivedValue(
        receipt?.received_value != null ? String(receipt.received_value) : "",
      );
      setReceivedAt(
        receipt?.received_at
          ? new Date(receipt.received_at).toISOString().split("T")[0]
          : "",
      );
    }
  }, [isOpen, receipt]);

  const parsedValue = parseFloat(receivedValue.replace(",", "."));
  const canSubmit = !isNaN(parsedValue) && parsedValue > 0 && receivedAt !== "";

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await surgeryRequestService.updateReceipt(solicitacao.id, {
        received_value: parsedValue,
        received_at: new Date(receivedAt).toISOString(),
      });
      showToast("Recebimento atualizado com sucesso.", "success");
      handleClose();
      onSuccess();
    } catch {
      showToast("Erro ao atualizar recebimento. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Editar Recebimento
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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

        {/* Content */}
        <div className="p-4 md:p-6 space-y-3 md:space-y-5">
          {/* Valor Recebido */}
          <div className="space-y-1.5">
            <label className="block ds-label mb-0">
              Valor Recebido (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs md:text-sm text-gray-500">
                R$
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={receivedValue}
                onChange={(e) => setReceivedValue(e.target.value)}
                placeholder="0,00"
                disabled={isSaving}
                className="ds-input pl-10 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Data do Recebimento */}
          <div className="space-y-1.5">
            <label className="block ds-label mb-0">
              Data do Recebimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              disabled={isSaving}
              className="ds-input disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 md:px-6 md:py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="ds-btn-outline disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
