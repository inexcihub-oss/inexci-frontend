"use client";

import React, { useState } from "react";

interface NewProcedureModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    modelName: string;
    procedureName: string;
  }) => Promise<void>;
}

const IconClose = ({ className = "" }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9.5 9.5L14.5 14.5M14.5 9.5L9.5 14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export function NewProcedureModelModal({
  isOpen,
  onClose,
  onSubmit,
}: NewProcedureModelModalProps) {
  const [modelName, setModelName] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!modelName.trim()) return;
    setIsLoading(true);
    try {
      await onSubmit({
        modelName: modelName.trim(),
        procedureName: procedureName.trim(),
      });
      setModelName("");
      setProcedureName("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setModelName("");
    setProcedureName("");
  };

  const handleClose = () => {
    if (isLoading) return;
    setModelName("");
    setProcedureName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-6 md:py-4 border-b border-neutral-200">
          <h2 className="flex-1 ds-modal-title font-urbanist">
            Procedimento - Novo modelo
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-neutral-900 hover:text-neutral-700 transition-colors disabled:opacity-50"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
          {/* Nome do modelo */}
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">
              Nome do modelo: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Artroplastia padrão Bradesco"
              className="ds-input"
              disabled={isLoading}
            />
          </div>

          {/* Procedimento */}
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">Procedimento:</label>
            <input
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="Artroplastia total do quadril"
              className="ds-input"
              disabled={isLoading}
            />
            <span className="text-xs text-gray-400">
              Você poderá adicionar códigos TUSS, OPME e documentos após criar o
              modelo.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-4 border-t-2 border-neutral-200">
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="ds-btn-outline"
          >
            Limpar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !modelName.trim()}
            className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Salvando...
              </span>
            ) : (
              "Criar modelo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
