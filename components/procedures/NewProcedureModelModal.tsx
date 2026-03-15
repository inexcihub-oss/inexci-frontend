"use client";

import React, { useState } from "react";

interface NewProcedureModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { modelName: string; procedureName: string }) => void;
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

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!modelName.trim() || !procedureName.trim()) return;
    onSubmit({
      modelName: modelName.trim(),
      procedureName: procedureName.trim(),
    });
    setModelName("");
    setProcedureName("");
  };

  const handleClear = () => {
    setModelName("");
    setProcedureName("");
  };

  const handleClose = () => {
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
            className="text-neutral-900 hover:text-neutral-700 transition-colors"
          >
            <IconClose />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 md:gap-4 p-4 md:p-6">
          {/* Nome do modelo */}
          <div className="flex flex-col gap-1">
            <label className="ds-label mb-0">Nome do modelo:</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Artroplastia padrão Bradesco"
              className="ds-input"
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
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-4 border-t-2 border-neutral-200">
          <button onClick={handleClear} className="ds-btn-outline">
            Limpar filtros
          </button>
          <button onClick={handleSubmit} className="ds-btn-primary">
            Mostrar resultados
          </button>
        </div>
      </div>
    </div>
  );
}
