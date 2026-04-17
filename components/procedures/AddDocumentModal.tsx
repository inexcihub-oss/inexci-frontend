"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Check, ChevronDown } from "lucide-react";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!isTypeDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTypeDropdownOpen]);

  // Gerencia overflow do body e foca o input de nome ao abrir
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    setIsTypeDropdownOpen(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && isValid) handleAdd();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end md:items-center justify-center"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white w-full md:max-w-md flex flex-col rounded-t-3xl md:rounded-2xl max-h-[92vh] md:max-h-[85vh] animate-slide-up md:animate-scale-in md:mx-4 shadow-xl">
        {/* Drag handle (mobile) */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 md:p-5 border-b border-neutral-100">
          <h2 className="ds-modal-title">Adicionar documento ou exame</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-2 -m-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="ds-modal-body overflow-visible">
          {/* Tipo do documento */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Tipo do documento <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="flex items-center justify-between w-full ds-input text-left"
              >
                <span
                  className={
                    selectedTypeLabel ? "text-neutral-900" : "text-neutral-400"
                  }
                >
                  {selectedTypeLabel || "Selecione o tipo"}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                    isTypeDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isTypeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-auto">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => {
                        setDocumentType(type.key);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-xs md:text-sm text-left transition-colors ${
                        documentType === type.key
                          ? "bg-teal-50 text-teal-700 font-medium"
                          : "text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {type.label}
                      {documentType === type.key && (
                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="ds-label mb-0">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Ex: Ressonância do Joelho"
              className="ds-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="ds-modal-footer">
          <button
            type="button"
            onClick={handleCancel}
            className="ds-btn-outline"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!isValid}
            className={`ds-btn-primary ${!isValid ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
