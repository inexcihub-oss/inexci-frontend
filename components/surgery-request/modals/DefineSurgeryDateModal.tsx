"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { getTransitionBlockError } from "@/lib/http-error";

interface DefineSurgeryDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

/**
 * Modal "Definir Data" — IN_SCHEDULING (4) → SCHEDULED (5).
 * Usado quando nenhuma data foi proposta na análise: o usuário digita
 * data e hora aqui e a confirma direto nesta etapa.
 */
export function DefineSurgeryDateModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: DefineSurgeryDateModalProps) {
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const { showToast } = useToast();

  const handleClose = () => {
    if (isSaving) return;
    setDate("");
    setAttempted(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!date.trim()) {
      setAttempted(true);
      showToast("Informe a data e hora da cirurgia.", "error");
      return;
    }
    setIsSaving(true);
    try {
      const iso = new Date(date).toISOString();
      await surgeryRequestService.updateDateOptions(solicitacao.id, {
        dateOptions: [iso],
      });
      await surgeryRequestService.confirmDate(solicitacao.id, {
        selectedDateIndex: 0,
      });
      showToast("Data confirmada! Status alterado para Agendada.", "success");
      setDate("");
      onSuccess();
    } catch (err) {
      showToast(
        getTransitionBlockError(err) ??
          "Erro ao confirmar data. Tente novamente.",
        "error",
      );
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
            Definir Data da Cirurgia
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
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <p className="text-xs md:text-sm text-gray-500">
            Nenhuma data foi proposta. Informe a data e hora da cirurgia para
            confirmar o agendamento.
          </p>
          <div className="space-y-1.5">
            <label className="block ds-label mb-0">
              Data e Hora <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              className={`ds-input disabled:opacity-50 ${attempted && !date.trim() ? "border-red-400 focus:ring-red-400" : ""}`}
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
            disabled={isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Confirmando..." : "Confirmar Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
