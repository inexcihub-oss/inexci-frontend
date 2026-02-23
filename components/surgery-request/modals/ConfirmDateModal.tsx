"use client";

import React, { useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface ConfirmDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: any;
  onSuccess: () => void;
}

/**
 * Modal "Confirmar Data" — IN_SCHEDULING (4) → SCHEDULED (5).
 * Exibe as datas propostas e permite confirmar uma delas.
 *
 * Referência visual: telas-inexci/status/em-agendamento/tela-detalhes-em-agendamento.png
 */
export function ConfirmDateModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: ConfirmDateModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<0 | 1 | 2 | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const dateOptions: string[] =
    solicitacao?.scheduling?.date_options ?? solicitacao?.date_options ?? [];

  const handleClose = () => {
    if (isSaving) return;
    setSelectedIndex(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (selectedIndex === null) return;
    setIsSaving(true);
    try {
      await surgeryRequestService.confirmDate(solicitacao.id, {
        selected_date_index: selectedIndex,
      });
      showToast("Data confirmada! Status alterado para Agendada.", "success");
      setSelectedIndex(null);
      onSuccess();
    } catch {
      showToast("Erro ao confirmar data. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Confirmar Data
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
            Selecione a data disponível para confirmar o agendamento da
            cirurgia.
          </p>

          {dateOptions.length > 0 ? (
            <div className="space-y-2">
              {dateOptions.map((date, index) => {
                const isSelected = selectedIndex === index;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index as 0 | 1 | 2)}
                    className={`w-full flex items-center gap-3 p-4 border-2 rounded-lg transition-colors text-left ${
                      isSelected
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                        isSelected
                          ? "border-teal-600 bg-teal-600"
                          : "border-gray-300"
                      }`}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Opção {index + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {formatDate(date)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Nenhuma data proposta disponível.
            </div>
          )}
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
            onClick={handleConfirm}
            disabled={
              selectedIndex === null || isSaving || dateOptions.length === 0
            }
            className="px-6 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Confirmando...
              </span>
            ) : (
              "Confirmar Data"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
