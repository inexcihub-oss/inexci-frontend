"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/shared/SectionCard";
import { Spinner } from "@/components/ui";
import {
  DocumentUploadModal,
  PRE_SURGERY_DOCUMENT_TYPES,
} from "@/components/documents/DocumentUploadModal";
import { DeleteDocumentModal } from "@/components/documents/DeleteDocumentModal";
import {
  patientDocumentService,
  PatientDocument,
} from "@/services/document.service";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";

const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PRE_SURGERY_DOCUMENT_TYPES.map((t) => [t.key, t.label]),
);

function formatDocumentType(key: string): string {
  return DOCUMENT_TYPE_LABELS[key] ?? key ?? "Documento";
}

function formatDocumentDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Documentos e exames do paciente. Segue o mesmo padrão de tabela da seção
 * Documentos da solicitação cirúrgica.
 */
export function PatientDocuments({
  patientId,
  clinicalRecordId,
}: {
  patientId: string;
  clinicalRecordId?: string;
}) {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] =
    useState<PatientDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    patientDocumentService
      .list(patientId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    try {
      await patientDocumentService.delete({
        id: documentToDelete.id,
        key: documentToDelete.key,
      });
      showToast("Documento deletado com sucesso", "success");
      setDocumentToDelete(null);
      load();
    } catch (err) {
      logger.error("Erro ao deletar documento:", err);
      showToast("Erro ao deletar documento", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SectionCard
        title="Documentos e exames"
        headerAction={
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="ds-btn-inline"
          >
            Adicionar
          </button>
        }
      >
        <div className="space-y-0">
          {/* Cabeçalho da tabela */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-b border-neutral-100">
            <div className="flex-1 min-w-0 text-xs text-gray-900 opacity-70">
              Tipo
            </div>
            <div className="hidden sm:block w-36 flex-shrink-0 text-xs text-gray-900 opacity-70">
              Anexado em:
            </div>
            <div className="hidden sm:block w-48 flex-shrink-0 text-xs text-gray-900 opacity-70">
              Tipo do arquivo:
            </div>
          </div>

          {/* Linhas de documentos */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="sm" />
            </div>
          ) : documents.length > 0 ? (
            documents.map((doc, index) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 transition-colors"
                style={
                  index < documents.length - 1
                    ? { borderBottom: "1px solid #DCDFE3" }
                    : {}
                }
              >
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <svg
                    className="w-6 h-6 text-gray-900 flex-shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 3V21H19V7.828L14.172 3H5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 9H11M8 13H16M8 17H13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <a
                    href={doc.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-gray-900 hover:text-teal-700 hover:underline transition-colors truncate"
                  >
                    {doc.name}
                  </a>
                  {clinicalRecordId && doc.clinicalRecordId === clinicalRecordId && (
                    <span className="shrink-0 text-[11px] font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                      Desta consulta
                    </span>
                  )}
                </div>
                <div className="hidden sm:block w-36 flex-shrink-0 text-xs text-gray-900">
                  {formatDocumentDate(doc.createdAt)}
                </div>
                <div className="hidden sm:flex w-48 flex-shrink-0 items-center justify-between">
                  <span className="text-xs text-gray-900">
                    {formatDocumentType(doc.key)}
                  </span>
                  <button
                    onClick={() => setDocumentToDelete(doc)}
                    className="w-6 h-6 flex items-center justify-center border border-neutral-100 rounded hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm p-1"
                    aria-label="Deletar documento"
                  >
                    <svg
                      className="w-4 h-4 text-red-500"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M7 6H17M10 3H14M7 6V18C7 19.1046 7.89543 20 9 20H15C16.1046 20 17 19.1046 17 18V6M10 11V16M14 11V16"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 md:py-8 text-center text-xs md:text-sm text-gray-500">
              Nenhum documento anexado
            </div>
          )}
        </div>
      </SectionCard>

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        patientId={patientId}
        clinicalRecordId={clinicalRecordId}
        onSuccess={load}
      />

      <DeleteDocumentModal
        isOpen={!!documentToDelete}
        onClose={() => setDocumentToDelete(null)}
        onConfirm={handleDelete}
        documentName={documentToDelete?.name ?? ""}
        isDeleting={isDeleting}
      />
    </>
  );
}
