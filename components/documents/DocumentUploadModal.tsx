"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, Upload, FileText, Trash2, Check } from "lucide-react";
import { documentService } from "@/services/document.service";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: string;
  onSuccess: () => void;
}

// Tipos de documento disponíveis
const DOCUMENT_TYPES = [
  { key: "personal_document", label: "RG/CNH" },
  { key: "health_plan_card", label: "Carteirinha do Convênio" },
  { key: "doctor_request", label: "Pedido Médico" },
  { key: "exam", label: "Exames" },
  { key: "additional_document", label: "Outros" },
] as const;

type DocumentTypeKey = (typeof DOCUMENT_TYPES)[number]["key"];

interface SelectedFile {
  file: File;
  type: DocumentTypeKey;
  name: string;
  isRequired: boolean;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentTypeKey>("exam");
  const [documentName, setDocumentName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setDocumentType("exam");
    setDocumentName("");
    setIsRequired(false);
    setError(null);
    setIsDragging(false);
  }, []);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-preencher nome com o nome do arquivo (sem extensão)
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExtension);
      setError(null);
    }
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExtension);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDocumentName("");
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!selectedFile) {
      setError("Selecione um arquivo para enviar.");
      return;
    }

    if (!documentName.trim()) {
      setError("Informe um nome para o documento.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await documentService.upload({
        surgery_request_id: surgeryRequestId,
        key: documentType,
        name: documentName.trim(),
        file: selectedFile,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao fazer upload do documento:", err);
      setError("Erro ao enviar documento. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const getDocumentTypeLabel = (key: DocumentTypeKey): string => {
    return DOCUMENT_TYPES.find((t) => t.key === key)?.label || key;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isUploading ? handleCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Adicionar Documento
          </h2>
          <button
            onClick={!isUploading ? handleCancel : undefined}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Dropzone */}
          <div
            ref={dropzoneRef}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300 hover:border-gray-400"}
              ${selectedFile ? "bg-gray-50" : ""}
            `}
          >
            {selectedFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900">Enviado</p>
                    <p className="text-xs text-gray-500 truncate">
                      {selectedFile.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Selecionar
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  Clique para anexar documento ou exames.
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Tipo do documento */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Tipo do documento
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                <span>{getDocumentTypeLabel(documentType)}</span>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {isTypeDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {DOCUMENT_TYPES.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() => {
                        setDocumentType(type.key);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        documentType === type.key
                          ? "bg-teal-50 text-teal-700"
                          : "text-gray-900"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Nome do documento */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Nome
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Ex: Ressonância do Joelho"
              className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Checkbox - Tornar obrigatório */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRequired(!isRequired)}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                isRequired
                  ? "bg-teal-700 border-teal-700"
                  : "bg-white border-gray-300"
              }`}
            >
              {isRequired && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className="text-sm text-gray-900">
              Tornar documento obrigatório?
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || !selectedFile}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                Enviando...
              </span>
            ) : (
              "Adicionar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
