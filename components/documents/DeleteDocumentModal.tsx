"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ModalFooter } from "@/components/shared/ModalFooter";

interface DeleteDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentName: string;
  isDeleting: boolean;
}

export function DeleteDocumentModal({
  isOpen,
  onClose,
  onConfirm,
  documentName,
  isDeleting,
}: DeleteDocumentModalProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title="Deletar Documento"
      size="sm"
      disableClose={isDeleting}
    >
        <div className="flex-1 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-sm text-gray-900 mb-2">
                Tem certeza que deseja deletar o documento?
              </p>
              <p className="text-xs md:text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-xl">
                {documentName}
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-3">
                Esta ação não pode ser desfeita. O arquivo será removido
                permanentemente do sistema e do armazenamento.
              </p>
            </div>
          </div>
        </div>

        <ModalFooter align="end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs md:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs md:text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
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
                Deletando...
              </span>
            ) : (
              "Deletar Documento"
            )}
          </button>
        </ModalFooter>
    </Modal>
  );
}
