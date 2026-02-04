"use client";

import React, { useState, useRef } from "react";
import { X, Upload, FileText, Trash2 } from "lucide-react";
import { documentService } from "@/services/document.service";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  surgeryRequestId: number;
  onSuccess: () => void;
}

interface SelectedFiles {
  personalDocument: File | null;
  doctorRequest: File | null;
  otherDocuments: File[];
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  surgeryRequestId,
  onSuccess,
}: DocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({
    personalDocument: null,
    doctorRequest: null,
    otherDocuments: [],
  });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personalDocumentRef = useRef<HTMLInputElement>(null);
  const doctorRequestRef = useRef<HTMLInputElement>(null);
  const otherDocumentsRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePersonalDocumentSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, personalDocument: file }));
    }
    event.target.value = "";
  };

  const handleDoctorRequestSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFiles((prev) => ({ ...prev, doctorRequest: file }));
    }
    event.target.value = "";
  };

  const handleOtherDocumentsSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles((prev) => ({
        ...prev,
        otherDocuments: [...prev.otherDocuments, ...Array.from(files)],
      }));
    }
    event.target.value = "";
  };

  const removePersonalDocument = () => {
    setSelectedFiles((prev) => ({ ...prev, personalDocument: null }));
  };

  const removeDoctorRequest = () => {
    setSelectedFiles((prev) => ({ ...prev, doctorRequest: null }));
  };

  const removeOtherDocument = (index: number) => {
    setSelectedFiles((prev) => ({
      ...prev,
      otherDocuments: prev.otherDocuments.filter((_, i) => i !== index),
    }));
  };

  const handleCancel = () => {
    setSelectedFiles({
      personalDocument: null,
      doctorRequest: null,
      otherDocuments: [],
    });
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    const { personalDocument, doctorRequest, otherDocuments } = selectedFiles;

    // Verifica se há pelo menos um arquivo selecionado
    if (!personalDocument && !doctorRequest && otherDocuments.length === 0) {
      setError("Selecione pelo menos um documento para enviar.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises: Promise<any>[] = [];

      // Upload RG/CNH
      if (personalDocument) {
        uploadPromises.push(
          documentService.upload({
            surgery_request_id: surgeryRequestId,
            key: "personal_document",
            name: personalDocument.name,
            file: personalDocument,
          }),
        );
      }

      // Upload Pedido Médico
      if (doctorRequest) {
        uploadPromises.push(
          documentService.upload({
            surgery_request_id: surgeryRequestId,
            key: "doctor_request",
            name: doctorRequest.name,
            file: doctorRequest,
          }),
        );
      }

      // Upload outros documentos
      for (const file of otherDocuments) {
        uploadPromises.push(
          documentService.upload({
            surgery_request_id: surgeryRequestId,
            key: "additional_document",
            name: file.name,
            file: file,
          }),
        );
      }

      await Promise.all(uploadPromises);

      // Limpar estado e fechar modal
      setSelectedFiles({
        personalDocument: null,
        doctorRequest: null,
        otherDocuments: [],
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Erro ao fazer upload dos documentos:", err);
      setError("Erro ao enviar documentos. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const hasFiles =
    selectedFiles.personalDocument ||
    selectedFiles.doctorRequest ||
    selectedFiles.otherDocuments.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isUploading ? handleCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-screen flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Adicionar Documentos
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* RG/CNH do Paciente */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              RG/CNH do Paciente
            </label>
            <div className="border border-neutral-100 rounded-lg p-3">
              {selectedFiles.personalDocument ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-teal-700 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">
                      {selectedFiles.personalDocument.name}
                    </span>
                  </div>
                  <button
                    onClick={removePersonalDocument}
                    className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    disabled={isUploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => personalDocumentRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                  <span>Selecionar arquivo</span>
                </button>
              )}
              <input
                ref={personalDocumentRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handlePersonalDocumentSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">
              Aceita: PDF, JPG, PNG, DOC (máx. 1 arquivo)
            </p>
          </div>

          {/* Pedido Médico */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Pedido Médico
            </label>
            <div className="border border-neutral-100 rounded-lg p-3">
              {selectedFiles.doctorRequest ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-teal-700 flex-shrink-0" />
                    <span className="text-sm text-gray-900 truncate">
                      {selectedFiles.doctorRequest.name}
                    </span>
                  </div>
                  <button
                    onClick={removeDoctorRequest}
                    className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    disabled={isUploading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => doctorRequestRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                  disabled={isUploading}
                >
                  <Upload className="w-4 h-4" />
                  <span>Selecionar arquivo</span>
                </button>
              )}
              <input
                ref={doctorRequestRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleDoctorRequestSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">
              Aceita: PDF, JPG, PNG, DOC (máx. 1 arquivo)
            </p>
          </div>

          {/* Outros Documentos */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Outros Documentos
            </label>
            <div className="border border-neutral-100 rounded-lg p-3 space-y-2">
              {selectedFiles.otherDocuments.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.otherDocuments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 py-1"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-teal-700 flex-shrink-0" />
                        <span className="text-sm text-gray-900 truncate">
                          {file.name}
                        </span>
                      </div>
                      <button
                        onClick={() => removeOtherDocument(index)}
                        className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                        disabled={isUploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => otherDocumentsRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors border-t border-neutral-100 pt-3"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                <span>Adicionar mais arquivos</span>
              </button>
              <input
                ref={otherDocumentsRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleOtherDocumentsSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500">
              Aceita: PDF, JPG, PNG, DOC (múltiplos arquivos)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-neutral-100">
          <button
            onClick={handleCancel}
            className="flex items-center justify-center font-semibold text-gray-700 bg-white border border-neutral-100 hover:bg-gray-50 transition-colors py-2 px-4 rounded-lg text-sm"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center justify-center font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors py-2 px-4 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || !hasFiles}
          >
            {isUploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Enviando...
              </>
            ) : (
              "Salvar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
