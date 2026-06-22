"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import {
  NotificationConfirmModal,
  type NotificationChannels,
} from "./NotificationConfirmModal";

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
    const opts: string[] = (solicitacao?.scheduling?.dateOptions ??
      solicitacao?.dateOptions ??
      []) as string[];
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
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const { showToast } = useToast();

  const hasPatientContact =
    !!solicitacao?.patient?.phone || !!solicitacao?.patient?.email;

  React.useEffect(() => {
    if (isOpen) {
      setDateOptions(initialDates);
      setIsNotificationModalOpen(false);
    }
  }, [isOpen, initialDates]);

  const validDates = dateOptions.filter((d) => d.trim() !== "");

  const handleClose = () => {
    if (isSaving) return;
    setIsNotificationModalOpen(false);
    onClose();
  };

  const submitUpdateDateOptions = async (channels: NotificationChannels | null) => {
    setIsSaving(true);
    try {
      const isoDates = validDates.map((d) => new Date(d).toISOString());
      const shouldNotifySchedulingOptions =
        channels !== null &&
        channels.whatsapp &&
        !!solicitacao?.patient?.phone;

      await surgeryRequestService.updateDateOptions(solicitacao.id, {
        dateOptions: isoDates,
        ...(shouldNotifySchedulingOptions ? { notifyPatient: true } : {}),
      });

      if (channels?.email && solicitacao?.patient?.email) {
        try {
          await surgeryRequestService.notify(solicitacao.id, {
            template: "status-change-patient",
            channels: { email: true, whatsapp: false },
            oldStatus: 4,
          });
        } catch {
          // Falha no e-mail não bloqueia o fluxo principal
        }
      }

      showToast("Datas atualizadas com sucesso.", "success");
      setIsNotificationModalOpen(false);
      onSuccess();
    } catch {
      showToast("Erro ao atualizar datas. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (validDates.length < 3) {
      showToast("Informe as 3 opções de data obrigatórias.", "error");
      return;
    }

    if (hasPatientContact) {
      setIsNotificationModalOpen(true);
      return;
    }

    void submitUpdateDateOptions(null);
  };

  const handleNotificationConfirm = (channels: NotificationChannels | null) => {
    setIsNotificationModalOpen(false);
    void submitUpdateDateOptions(channels);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleClose}
        />

        <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col overflow-hidden pb-20 sm:pb-0 max-h-[92vh] sm:max-h-[90vh]">
          <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-neutral-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-4 border-b border-gray-100 flex-shrink-0">
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

          <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            <p className="text-sm text-gray-500">
              Atualize as opções de data disponíveis para a realização da
              cirurgia. As <strong>3 datas são obrigatórias</strong>.
            </p>
            <div className="space-y-4">
              {dateOptions.map((date, index) => (
                <div key={index} className="space-y-1.5">
                  <label className="block ds-label mb-0">
                    Data {index + 1}
                    <span className="text-red-500 ml-0.5">*</span>
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

          <div className="flex items-center justify-end gap-3 px-5 py-4 sm:px-6 border-t border-gray-100 flex-shrink-0">
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
              {isSaving ? "Salvando..." : "Salvar Datas"}
            </button>
          </div>
        </div>
      </div>

      <NotificationConfirmModal
        isOpen={isNotificationModalOpen && hasPatientContact}
        onClose={() => {
          if (!isSaving) setIsNotificationModalOpen(false);
        }}
        currentStatus="Em Agendamento"
        newStatus="Em Agendamento"
        onConfirm={handleNotificationConfirm}
        isLoading={isSaving}
        patientEmail={solicitacao?.patient?.email}
        patientPhone={solicitacao?.patient?.phone}
      />
    </>
  );
}
