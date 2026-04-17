"use client";

import React from "react";
import { Mail, MessageSquare, AlertTriangle } from "lucide-react";

interface NotificationConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  newStatus: string;
  onConfirm: (notifyPatient: boolean) => void;
  isLoading?: boolean;
  /** E-mail do paciente (para mostrar canal disponível) */
  patientEmail?: string | null;
  /** Telefone do paciente (para mostrar canal WhatsApp disponível) */
  patientPhone?: string | null;
}

/**
 * Modal de confirmação de notificação ao paciente.
 * Aparece ao alterar status de solicitações antes de "Realizada".
 * O usuário escolhe se deseja notificar o paciente por email.
 */
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
  if (!isOpen) return null;

  const hasEmail = !!patientEmail;
  const hasPhone = !!patientPhone;
  const hasNoContact = !hasEmail && !hasPhone;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => !isLoading && onClose()}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 text-lg font-semibold text-gray-900">
            Notificar paciente
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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

        {/* Body */}
        <div className="p-6">
          {/* Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-4">
            <svg
              className="w-5 h-5 text-blue-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="text-sm text-blue-700 leading-normal">
              Deseja enviar uma notificação ao paciente sobre a alteração de
              status?
            </p>
          </div>

          {/* Status change display */}
          <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl mb-6">
            <span className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">
              {currentStatus}
            </span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-sm font-medium">
              {newStatus}
            </span>
          </div>

          {/* Canais disponíveis */}
          <div className="space-y-2 mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Canais de notificação
            </p>
            <div className="flex gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  hasEmail
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400 line-through"
                }`}
              >
                <Mail className="w-4 h-4" />
                E-mail {hasEmail ? "✓" : "✗"}
              </div>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  hasPhone
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-400 line-through"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp {hasPhone ? "✓" : "✗"}
              </div>
            </div>
          </div>

          {/* Aviso de dados faltantes */}
          {hasNoContact && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                O paciente não possui e-mail nem telefone cadastrado. A
                notificação não será enviada. Atualize o cadastro do paciente
                para habilitar o envio.
              </p>
            </div>
          )}
          {!hasNoContact && (!hasEmail || !hasPhone) && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                {!hasEmail
                  ? "Paciente sem e-mail cadastrado — notificação será enviada apenas por WhatsApp."
                  : "Paciente sem telefone cadastrado — notificação será enviada apenas por e-mail."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={() => onConfirm(false)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Apenas alterar
          </button>
          <button
            onClick={() => onConfirm(true)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Enviando..." : "Sim, notificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
