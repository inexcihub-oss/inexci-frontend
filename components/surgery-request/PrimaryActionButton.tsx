"use client";

import React from "react";

interface PrimaryActionButtonProps {
  /** Número do status (1-9) */
  status: number;
  onSendRequest: () => void;
  onStartAnalysis: () => void;
  onUpdateAuthorizations: () => void;
  onConfirmDate: () => void;
  onSurgeryStatus: () => void;
  onInvoice: () => void;
  onConfirmReceipt: () => void;
}

const ACTION_CONFIG: Record<
  number,
  { label: string; action: keyof PrimaryActionButtonProps } | null
> = {
  1: { label: "Enviar Solicitação", action: "onSendRequest" },
  2: { label: "Solicitação em Análise", action: "onStartAnalysis" },
  3: { label: "Atualizar Autorizações", action: "onUpdateAuthorizations" },
  4: { label: "Confirmar Data", action: "onConfirmDate" },
  5: { label: "Status da Cirurgia", action: "onSurgeryStatus" },
  6: { label: "Faturar Solicitação", action: "onInvoice" },
  7: { label: "Confirmar Recebimento", action: "onConfirmReceipt" },
  8: null,
  9: null,
};

export function PrimaryActionButton({
  status,
  onSendRequest,
  onStartAnalysis,
  onUpdateAuthorizations,
  onConfirmDate,
  onSurgeryStatus,
  onInvoice,
  onConfirmReceipt,
}: PrimaryActionButtonProps) {
  const config = ACTION_CONFIG[status];
  if (!config) return null;

  const handlers: Record<string, () => void> = {
    onSendRequest,
    onStartAnalysis,
    onUpdateAuthorizations,
    onConfirmDate,
    onSurgeryStatus,
    onInvoice,
    onConfirmReceipt,
  };

  const handleClick = handlers[config.action as string];

  return (
    <button
      onClick={handleClick}
      className="bg-teal-700 text-white text-xs md:text-sm font-semibold hover:bg-teal-800 active:scale-[0.98] transition-all flex items-center justify-center w-full px-6 py-2.5 gap-3 rounded-xl leading-normal min-h-[36px] md:min-h-[44px]"
    >
      {config.label}
    </button>
  );
}
