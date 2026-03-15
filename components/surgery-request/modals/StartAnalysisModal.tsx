"use client";

import React, { useState } from "react";
import {
  surgeryRequestService,
  StartAnalysisPayload,
} from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";

interface StartAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string;
  onSuccess: () => void;
}

/**
 * Modal "Solicitação em análise" — transição SENT (2) → IN_ANALYSIS (3).
 * Registra o número da solicitação na operadora e as datas de cotação.
 *
 * Referência visual: figma.com/design/OXxoQQfGpMYtBNGEMeWGUn — node 7:2273
 */
export function StartAnalysisModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: StartAnalysisModalProps) {
  const [requestNumber, setRequestNumber] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [quotation1Number, setQuotation1Number] = useState("");
  const [quotation1ReceivedAt, setQuotation1ReceivedAt] = useState("");
  const [quotation2Number, setQuotation2Number] = useState("");
  const [quotation2ReceivedAt, setQuotation2ReceivedAt] = useState("");
  const [quotation3Number, setQuotation3Number] = useState("");
  const [quotation3ReceivedAt, setQuotation3ReceivedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const canSubmit = requestNumber.trim() !== "" && receivedAt !== "";

  const handleClose = () => {
    if (isSaving) return;
    setRequestNumber("");
    setReceivedAt("");
    setQuotation1Number("");
    setQuotation1ReceivedAt("");
    setQuotation2Number("");
    setQuotation2ReceivedAt("");
    setQuotation3Number("");
    setQuotation3ReceivedAt("");
    setNotes("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      const payload: StartAnalysisPayload = {
        request_number: requestNumber.trim(),
        received_at: receivedAt,
        notes: notes.trim() || undefined,
      };

      if (quotation1Number) {
        payload.quotation_1_number = quotation1Number;
        if (quotation1ReceivedAt)
          payload.quotation_1_received_at = quotation1ReceivedAt;
      }
      if (quotation2Number) {
        payload.quotation_2_number = quotation2Number;
        if (quotation2ReceivedAt)
          payload.quotation_2_received_at = quotation2ReceivedAt;
      }
      if (quotation3Number) {
        payload.quotation_3_number = quotation3Number;
        if (quotation3ReceivedAt)
          payload.quotation_3_received_at = quotation3ReceivedAt;
      }

      await surgeryRequestService.startAnalysis(surgeryRequestId, payload);
      showToast("Status atualizado para Em Análise", "success");
      onSuccess();
    } catch {
      showToast("Erro ao atualizar status. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "ds-input disabled:opacity-50";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal — largura fiel ao Figma (~650px), altura fixa igual aos modais OPME/TUSS */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[650px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-6 md:py-4 border-b border-gray-200 shrink-0">
          <h2 className="flex-1 text-lg font-semibold text-gray-900">
            Solicitação em análise
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
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

        {/* Conteúdo com scroll */}
        <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6 overflow-y-auto">
          {/* Alert informativo */}
          <div className="flex items-center gap-3 p-3 md:p-4 bg-blue-50 rounded-xl">
            <p className="text-sm md:text-base text-blue-600 leading-normal">
              Para indicar que sua solicitação está em análise, preencha o
              número da solicitação e a data de recebimento.
            </p>
          </div>

          {/* Seções com maior espaçamento entre si */}
          <div className="flex flex-col gap-8">
            {/* ── Dados da Solicitação ── */}
            <div className="flex flex-col gap-3 md:gap-4">
              <p className="text-sm md:text-base font-semibold text-gray-500">
                Dados da Solicitação
              </p>

              <div className="flex gap-4">
                {/* Nº da solicitação */}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">
                    <span className="text-red-900 mr-0.5">*</span>
                    Nº da solicitação
                  </label>
                  <input
                    type="text"
                    value={requestNumber}
                    onChange={(e) => setRequestNumber(e.target.value)}
                    placeholder="Ex: 0000000-0"
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>

                {/* Data de recebimento */}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">
                    <span className="text-red-900 mr-0.5">*</span>
                    Data de recebimento
                  </label>
                  <input
                    type="date"
                    value={receivedAt}
                    onChange={(e) => setReceivedAt(e.target.value)}
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* ── Dados da cotação ── */}
            <div className="flex flex-col gap-3 md:gap-4">
              <p className="text-sm md:text-base font-semibold text-gray-500">
                Dados da cotação
              </p>

              {/* Cotação 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">
                    Nº proposta de cotação 1
                  </label>
                  <input
                    type="text"
                    value={quotation1Number}
                    onChange={(e) => setQuotation1Number(e.target.value)}
                    placeholder="Ex: 0000000-0"
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">Data de recebimento</label>
                  <input
                    type="date"
                    value={quotation1ReceivedAt}
                    onChange={(e) => setQuotation1ReceivedAt(e.target.value)}
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Cotação 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">
                    Nº proposta de cotação 2
                  </label>
                  <input
                    type="text"
                    value={quotation2Number}
                    onChange={(e) => setQuotation2Number(e.target.value)}
                    placeholder="Ex: 0000000-0"
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">Data de recebimento</label>
                  <input
                    type="date"
                    value={quotation2ReceivedAt}
                    onChange={(e) => setQuotation2ReceivedAt(e.target.value)}
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Cotação 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">
                    Nº proposta de cotação 3
                  </label>
                  <input
                    type="text"
                    value={quotation3Number}
                    onChange={(e) => setQuotation3Number(e.target.value)}
                    placeholder="Ex: 0000000-0"
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="ds-label mb-0">Data de recebimento</label>
                  <input
                    type="date"
                    value={quotation3ReceivedAt}
                    onChange={(e) => setQuotation3ReceivedAt(e.target.value)}
                    disabled={isSaving}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label className="ds-label mb-0">Observações</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Digite sua observação..."
                  disabled={isSaving}
                  className="ds-textarea h-40 resize transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 md:px-6 md:py-4 border-t-2 border-gray-200 shrink-0">
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
            className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
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
                Salvando...
              </span>
            ) : (
              "Atualizar status"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
