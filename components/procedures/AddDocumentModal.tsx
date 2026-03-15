"use client";

import React, { useState } from "react";

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (doc: { type: string; name: string }) => void;
}

const DOCUMENT_TYPES = [
  { key: "identity", label: "Identidade (RG/CNH/CPF)" },
  { key: "health_card", label: "Carteira do convênio" },
  { key: "medical_order", label: "Pedido médico" },
  { key: "exam", label: "Exames" },
  { key: "exam_report", label: "Laudo do Exame" },
  { key: "clinical_history", label: "Histórico Clínico" },
  { key: "other", label: "Outros" },
];

export function AddDocumentModal({
  isOpen,
  onClose,
  onAdd,
}: AddDocumentModalProps) {
  const [documentType, setDocumentType] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const selectedTypeLabel =
    DOCUMENT_TYPES.find((t) => t.key === documentType)?.label || "";

  const isValid = documentType !== "" && documentName.trim() !== "";

  const handleAdd = () => {
    if (!isValid) return;
    onAdd({ type: selectedTypeLabel, name: documentName.trim() });
    setDocumentType("");
    setDocumentName("");
    onClose();
  };

  const handleCancel = () => {
    setDocumentType("");
    setDocumentName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-2xl font-semibold text-neutral-900 font-urbanist">
            Adicionar documento ou exame
          </h2>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6">
          {/* Tipo do documento */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">
              Tipo do documento
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <span
                  className={
                    selectedTypeLabel ? "text-neutral-900" : "text-neutral-400"
                  }
                >
                  {selectedTypeLabel || "Selecione o tipo"}
                </span>
                <svg
                  className={`w-4 h-4 text-neutral-500 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M3.76 5.48L8 9.72L12.24 5.48"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-auto">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => {
                        setDocumentType(type.key);
                        setIsTypeDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-sm text-left hover:bg-neutral-100 transition-colors"
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-black">Nome</label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Nome do documento"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-3 py-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2.5 text-sm font-semibold text-neutral-900 border-2 border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isValid}
            className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              isValid
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
            }`}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
