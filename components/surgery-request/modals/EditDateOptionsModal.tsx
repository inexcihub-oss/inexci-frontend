"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  SurgeryRequestDetail,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import Input from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/http-error";
import { SurgeryRequestStatusCode } from "@/lib/surgery-request-status";
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

  const submitUpdateDateOptions = async (
    channels: NotificationChannels | null,
  ) => {
    setIsSaving(true);
    try {
      const isoDates = validDates.map((d) => new Date(d).toISOString());
      const shouldNotifySchedulingOptions =
        channels !== null && channels.whatsapp && !!solicitacao?.patient?.phone;

      await surgeryRequestService.updateDateOptions(solicitacao.id, {
        dateOptions: isoDates,
        ...(shouldNotifySchedulingOptions ? { notifyPatient: true } : {}),
      });

      let notifyError: string | null = null;
      if (channels?.email && solicitacao?.patient?.email) {
        try {
          await surgeryRequestService.notify(solicitacao.id, {
            template: "status-change-patient",
            channels: { email: true, whatsapp: false },
            oldStatus: SurgeryRequestStatusCode.IN_SCHEDULING,
          });
        } catch (e) {
          notifyError = getApiErrorMessage(e, "falha no envio do e-mail");
        }
      }

      if (notifyError) {
        showToast(
          `Datas atualizadas, mas o paciente não foi notificado: ${notifyError}`,
          "warning",
        );
      } else {
        showToast("Datas atualizadas com sucesso.", "success");
      }
      setIsNotificationModalOpen(false);
      onSuccess();
    } catch (e) {
      showToast(
        getApiErrorMessage(e, "Erro ao atualizar datas. Tente novamente."),
        "error",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (validDates.length < 1) {
      showToast("Informe pelo menos 1 data.", "error");
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
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Editar Datas"
        size="sm"
        disableClose={isSaving}
        footer={
          <ModalFooter align="end">
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
          </ModalFooter>
        }
      >
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          <p className="text-sm text-gray-500">
            Atualize as opções de data disponíveis para a realização da
            cirurgia. Pelo menos <strong>1 data é obrigatória</strong>.
          </p>
          <div className="space-y-4">
            {dateOptions.map((date, index) => (
              <div key={index} className="space-y-1.5">
                <label
                  htmlFor={`edit-date-option-${index}`}
                  className="block ds-label mb-0"
                >
                  Data {index + 1}
                  {index === 0 ? (
                    <span className="text-red-500 ml-0.5">*</span>
                  ) : (
                    <span className="text-gray-400 ml-1 text-xs font-normal">
                      (opcional)
                    </span>
                  )}
                </label>
                <Input
                  id={`edit-date-option-${index}`}
                  type="datetime-local"
                  value={date}
                  onChange={(e) => {
                    const next = [...dateOptions];
                    next[index] = e.target.value;
                    setDateOptions(next);
                  }}
                  disabled={isSaving}
                  className="disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

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
