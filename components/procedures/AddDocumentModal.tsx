"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import Input from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";

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
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(
    isTypeDropdownOpen,
    () => setIsTypeDropdownOpen(false),
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

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
    if (e.key === "Enter" && isValid) handleAdd();
  };

  const dropdown = isTypeDropdownOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: position.top + 4,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="bg-white border border-neutral-200 rounded-xl shadow-lg max-h-52 overflow-auto"
    >
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
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Adicionar documento ou exame"
      size="sm"
      footer={
        <ModalFooter align="end">
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
        </ModalFooter>
      }
    >
      <div className="ds-modal-body" onKeyDown={handleKeyDown}>
        <div className="flex flex-col gap-1.5">
          <label className="ds-label mb-0">
            Tipo do documento <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={anchorRef}>
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isTypeDropdownOpen}
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
          </div>
          {dropdown &&
            typeof document !== "undefined" &&
            createPortal(dropdown, document.body)}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="adicionar-documento-nome" className="ds-label mb-0">
            Nome <span className="text-red-500">*</span>
          </label>
          <Input
            id="adicionar-documento-nome"
            ref={nameInputRef}
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Ex: Ressonância do Joelho"
          />
        </div>
      </div>
    </Modal>
  );
}
