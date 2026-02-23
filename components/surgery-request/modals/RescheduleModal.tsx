"use client";

import React, { useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onSuccess: () => void;
}

/**
 * Modal "Reagendar Cirurgia" — SCHEDULED (5), sem mudança de status.
 * Permite definir uma nova data de cirurgia.
 *
 * Referência visual: telas-inexci/status/agendada/modal-status-cirurgia-etapa-2-reagendada.png
 */
export function RescheduleModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: RescheduleModalProps) {
  const [newDate, setNewDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const handleClose = () => {
    if (isSaving) return;
    setNewDate("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!newDate.trim()) return;
    setIsSaving(true);
    try {
      await surgeryRequestService.reschedule(solicitacao.id, {
        new_date: new Date(newDate).toISOString(),
      });
      showToast("Cirurgia reagendada com sucesso.", "success");
      setNewDate("");
      onSuccess();
    } catch {
      showToast("Erro ao reagendar cirurgia. Tente novamente.", "error");
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
            Reagendar Cirurgia
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
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            Informe a nova data para a realização da cirurgia.
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-gray-900">
              Nova Data <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
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
            disabled={!newDate.trim() || isSaving}
            className="px-6 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Reagendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
