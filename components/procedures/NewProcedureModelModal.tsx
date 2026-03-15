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
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-neutral-200">
          <h2 className="flex-1 text-2xl font-semibold text-neutral-900 font-urbanist">
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
        <div className="flex flex-col gap-4 p-6">
          {/* Nome do modelo */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">
              Nome do modelo:
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Artroplastia padrão Bradesco"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Procedimento */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">
              Procedimento:
            </label>
            <input
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              placeholder="Artroplastia total do quadril"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-4 border-t-2 border-neutral-200">
          <button
            onClick={handleClear}
            className="px-6 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors"
          >
            Limpar filtros
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-xl hover:bg-teal-800 transition-colors"
          >
            Mostrar resultados
          </button>
        </div>
      </div>
    </div>
  );
}
