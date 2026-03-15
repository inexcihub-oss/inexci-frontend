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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-gray-200">
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
        <div className="p-4 md:p-6 space-y-3 md:space-y-4">
          <p className="text-xs md:text-sm text-gray-500">
            Informe a nova data para a realização da cirurgia.
          </p>
          <div className="space-y-1.5">
            <label className="block ds-label mb-0">
              Nova Data <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
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
            disabled={!newDate.trim() || isSaving}
            className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? "Salvando..." : "Reagendar"}
          </button>
        </div>
      </div>
    </div>
  );
}
