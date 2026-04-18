"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface EditDateOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: SurgeryRequestDetail;
  onSuccess: () => void;
}

/**
 * Modal "Editar Datas" — IN_SCHEDULING (4), sem mudança de status.
 * Permite atualizar as opções de data propostas para a cirurgia.
 *
 * Referência visual: telas-inexci/status/em-agendamento/tela-detalhes-em-agendamento.png
 */
export function EditDateOptionsModal({
  isOpen,
  onClose,
  solicitacao,
  onSuccess,
}: EditDateOptionsModalProps) {
  const initialDates: string[] = React.useMemo(() => {
    const opts: string[] = (solicitacao?.scheduling?.date_options ??
      solicitacao?.date_options ??
      []) as string[];
    // Converter ISO para datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocal = (iso: string) => {
      try {
        return new Date(iso).toISOString().slice(0, 16);
      } catch {
        return "";
      }
    };
    const padded = [...opts.map(toLocal), "", "", ""].slice(0, 3);
    return padded;
  }, [solicitacao]);

  const [dateOptions, setDateOptions] = useState<string[]>(initialDates);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (isOpen) {
      setDateOptions(initialDates);
    }
  }, [isOpen, initialDates]);

  const validDates = dateOptions.filter((d) => d.trim() !== "");
  const canSubmit = validDates.length >= 1;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await surgeryRequestService.updateDateOptions(solicitacao.id, {
        date_options: validDates.map((d) => new Date(d).toISOString()),
      });
      showToast("Datas atualizadas com sucesso.", "success");
      onSuccess();
    } catch {
      showToast("Erro ao atualizar datas. Tente novamente.", "error");
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
          <h2 className="text-lg font-semibold text-gray-900">Editar Datas</h2>
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
          <p className="text-xs md:text-sm text-gray-500">
            Atualize as opções de data disponíveis para a realização da
            cirurgia. Ao menos uma data é obrigatória.
          </p>
          <div className="space-y-3 md:space-y-4">
            {dateOptions.map((date, index) => (
              <div key={index} className="space-y-1.5">
                <label className="block ds-label mb-0">
                  Data {index + 1}
                  {index === 0 && (
                    <span className="text-red-500 ml-0.5">*</span>
                  )}
                  {index > 0 && (
                    <span className="text-gray-400 font-normal ml-1">
                      (opcional)
                    </span>
                  )}
                </label>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => {
                    const next = [...dateOptions];
                    next[index] = e.target.value;
                    setDateOptions(next);
                  }}
                  disabled={isSaving}
                  className="ds-input disabled:opacity-50"
                />
              </div>
            ))}
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
            {isSaving ? "Salvando..." : "Salvar Datas"}
          </button>
        </div>
      </div>
    </div>
  );
}
