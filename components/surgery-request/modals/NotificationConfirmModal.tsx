"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  AlertTriangle,
  BellRing,
  ArrowRight,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";

export interface NotificationChannels {
  email: boolean;
  whatsapp: boolean;
}

interface NotificationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  newStatus: string;
  onConfirm: (channels: NotificationChannels | null) => void;
  isLoading?: boolean;
  patientEmail?: string | null;
  patientPhone?: string | null;
}

export function NotificationConfirmModal({
  isOpen,
  onClose,
  currentStatus,
  newStatus,
  onConfirm,
  isLoading = false,
  patientEmail,
  patientPhone,
}: NotificationConfirmModalProps) {
  const hasEmail = !!patientEmail;
  const hasPhone = !!patientPhone;
  const hasNoContact = !hasEmail && !hasPhone;

  const [emailSelected, setEmailSelected] = useState(hasEmail);
  const [whatsappSelected, setWhatsappSelected] = useState(hasPhone);

  useEffect(() => {
    if (isOpen) {
      setEmailSelected(hasEmail);
      setWhatsappSelected(hasPhone);
    }
  }, [isOpen, hasEmail, hasPhone]);

  const noneSelected = !emailSelected && !whatsappSelected;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (noneSelected) return;
    onConfirm({ email: emailSelected, whatsapp: whatsappSelected });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      disableClose={isLoading}
      title={
        <span className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center shadow-sm flex-shrink-0">
            <BellRing className="w-5 h-5 text-white" />
          </span>
          Notificar paciente
        </span>
      }
      footer={
        <ModalFooter align="end">
          <button
            onClick={() => onConfirm(null)}
            disabled={isLoading}
            className="ds-btn-outline disabled:opacity-50"
          >
            Não quero notificar
          </button>
          {!hasNoContact && (
            <button
              onClick={handleConfirm}
              disabled={isLoading || noneSelected}
              className="ds-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Enviando..." : "Notificar paciente"}
            </button>
          )}
        </ModalFooter>
      }
    >
      <p className="px-6 pt-4 text-xs text-gray-500">
        Selecione como deseja comunicar a atualização
      </p>
      <div className="flex items-center justify-center gap-2 px-6 pt-4 pb-4">
        <span className="px-3 py-1.5 bg-white border border-neutral-100 text-gray-600 rounded-lg text-xs font-medium shadow-sm">
          {currentStatus}
        </span>
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-700 shadow-sm">
          <ArrowRight className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm">
          {newStatus}
        </span>
      </div>

      <div className="px-6 pb-6">
        {hasNoContact ? (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 leading-relaxed">
              O paciente não possui e-mail nem telefone cadastrado.{" "}
              <span className="font-medium">
                A notificação não poderá ser enviada.
              </span>{" "}
              Atualize o cadastro do paciente para habilitar o envio.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Canais de notificação
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={!hasEmail || isLoading}
                onClick={() => hasEmail && setEmailSelected((v) => !v)}
                className={[
                  "flex-1 flex flex-col items-center gap-2.5 py-4 px-3 rounded-2xl border-2 transition-all duration-200 select-none",
                  !hasEmail
                    ? "border-neutral-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : emailSelected
                      ? "border-teal-600 bg-teal-50 shadow-sm cursor-pointer"
                      : "border-neutral-100 bg-white hover:border-gray-200 hover:bg-gray-50 cursor-pointer active:scale-[0.97]",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    emailSelected && hasEmail ? "bg-teal-700" : "bg-gray-100",
                  ].join(" ")}
                >
                  <Mail
                    className={[
                      "w-5 h-5",
                      emailSelected && hasEmail
                        ? "text-white"
                        : "text-gray-400",
                    ].join(" ")}
                  />
                </div>
                <div className="text-center">
                  <p
                    className={[
                      "text-sm font-semibold",
                      emailSelected && hasEmail
                        ? "text-teal-700"
                        : "text-gray-500",
                    ].join(" ")}
                  >
                    E-mail
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[110px]">
                    {hasEmail ? patientEmail : "Não cadastrado"}
                  </p>
                </div>
                {emailSelected && hasEmail && (
                  <div className="w-4 h-4 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </button>

              <button
                type="button"
                disabled={!hasPhone || isLoading}
                onClick={() => hasPhone && setWhatsappSelected((v) => !v)}
                className={[
                  "flex-1 flex flex-col items-center gap-2.5 py-4 px-3 rounded-2xl border-2 transition-all duration-200 select-none",
                  !hasPhone
                    ? "border-neutral-100 bg-gray-50 opacity-50 cursor-not-allowed"
                    : whatsappSelected
                      ? "border-teal-600 bg-teal-50 shadow-sm cursor-pointer"
                      : "border-neutral-100 bg-white hover:border-gray-200 hover:bg-gray-50 cursor-pointer active:scale-[0.97]",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    whatsappSelected && hasPhone
                      ? "bg-teal-700"
                      : "bg-gray-100",
                  ].join(" ")}
                >
                  <MessageSquare
                    className={[
                      "w-5 h-5",
                      whatsappSelected && hasPhone
                        ? "text-white"
                        : "text-gray-400",
                    ].join(" ")}
                  />
                </div>
                <div className="text-center">
                  <p
                    className={[
                      "text-sm font-semibold",
                      whatsappSelected && hasPhone
                        ? "text-teal-700"
                        : "text-gray-500",
                    ].join(" ")}
                  >
                    WhatsApp
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[110px]">
                    {hasPhone ? patientPhone : "Não cadastrado"}
                  </p>
                </div>
                {whatsappSelected && hasPhone && (
                  <div className="w-4 h-4 rounded-full bg-teal-700 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>

            {noneSelected && (
              <p className="mt-2.5 text-xs text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Selecione ao menos um canal para enviar a notificação.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
