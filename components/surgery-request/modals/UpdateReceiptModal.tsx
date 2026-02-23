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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
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
        <div className="p-6 space-y-5">
          {/* Valor Recebido */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">
              Valor Recebido (R$) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
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
                className="w-full pl-10 pr-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Data do Recebimento */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">
              Data do Recebimento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              disabled={isSaving}
              className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSaving}
            className="px-6 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
