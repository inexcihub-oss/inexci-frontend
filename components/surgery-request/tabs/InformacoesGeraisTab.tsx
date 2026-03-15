"use client";

import React, { useState, useEffect, useRef } from "react";
import { documentService, DOCUMENT_FOLDERS } from "@/services/document.service";
import { EditableProcedureData } from "@/components/surgery-request/EditableProcedureData";
import {
  DocumentUploadModal,
  PRE_SURGERY_DOCUMENT_TYPES,
} from "@/components/documents/DocumentUploadModal";
import { DeleteDocumentModal } from "@/components/documents/DeleteDocumentModal";
import { AnalysisDataSection } from "@/components/surgery-request/sections/AnalysisDataSection";
import { SchedulingSection } from "@/components/surgery-request/sections/SchedulingSection";
import { SectionCard } from "@/components/shared/SectionCard";
import { Checkbox } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

// ─── Tipos de documento exibidos em Informações Gerais ───────────────────────

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  personal_document: "RG/CNH",
  health_plan_card: "Carteirinha do Convênio",
  exam: "Exames",
  exam_report: "Laudo do Exame",
  exam_images: "Imagens do Exame",
  clinical_history: "Histórico Clínico",
  medical_conduct: "Conduta Médica",
  signed_report: "Laudo Assinado",
  surgery_auth_document: "Guia de Autorização",
  additional_document: "Outro Documento",
};

function formatDocumentType(key: string): string {
  return DOCUMENT_TYPE_LABELS[key] ?? key ?? "Documento";
}

// ─── Interface de props ───────────────────────────────────────────────────────

interface InformacoesGeraisTabProps {
  solicitacao: any;
  selectedDocuments: Set<string>;
  handleSelectDocument: (docId: string) => void;
  handleSelectAllDocuments: () => void;
  onUpdateProcedure: () => void;
  surgeryRequestId: string;
  onDocumentsUploaded: () => void;
  statusNum: number;
  pendingDateIndex: number | null;
  onSelectDate: (index: number) => void;
  onEditDateOptions: () => void;
  onReschedule: () => void;
}

/**
 * Aba "Informações Gerais" na tela de detalhes da solicitação cirúrgica.
 *
 * Seções exibidas (condicionalmente, por status):
 * - Dados do procedimento (sempre)
 * - Dados da análise (status ≥ 3)
 * - Agendamento (status 4 e 5)
 * - Documentos (sempre)
 */
export function InformacoesGeraisTab({
  solicitacao,
  selectedDocuments,
  handleSelectDocument,
  handleSelectAllDocuments,
  onUpdateProcedure,
  surgeryRequestId,
  onDocumentsUploaded,
  statusNum,
  pendingDateIndex,
  onSelectDate,
  onEditDateOptions,
  onReschedule,
}: InformacoesGeraisTabProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const isReadOnly = statusNum >= 2;

  // Documentos pré-cirúrgicos: excluir pastas post-surgical e report, e imagens do laudo
  const preSurgeryDocs = React.useMemo(
    () =>
      (solicitacao.documents ?? []).filter(
        (d: any) =>
          !d.path?.startsWith("post-surgical/") &&
          !d.path?.startsWith("report/") &&
          d.key !== "report_images",
      ),
    [solicitacao.documents],
  );

  const handleConfirmDelete = async () => {
    if (!documentToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await documentService.delete({
        id: documentToDelete.id,
        key: documentToDelete.key,
        surgery_request_id: solicitacao.id,
      });
      showToast("Documento deletado com sucesso", "success");
      onDocumentsUploaded();
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch {
      showToast("Erro ao deletar documento", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const documentHeaderAction = isReadOnly ? null : (
    <button
      onClick={() => setIsUploadModalOpen(true)}
      className="ds-btn-inline"
    >
      Adicionar
    </button>
  );

  // ── Tooltip de info sobre a seção Documentos ────────────────────────────────
  const [showDocTooltip, setShowDocTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!showDocTooltip) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(e.target as Node)
      ) {
        setShowDocTooltip(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDocTooltip]);

  // Fecha ao rolar a página
  useEffect(() => {
    if (!showDocTooltip) return;
    const close = () => setShowDocTooltip(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [showDocTooltip]);

  function openTooltip() {
    if (!infoButtonRef.current) return;
    const rect = infoButtonRef.current.getBoundingClientRect();
    setTooltipPos({ top: rect.bottom + 8, left: rect.left });
    setShowDocTooltip(true);
  }

  const documentTitle = (
    <span className="flex items-center gap-1.5">
      Documentos
      <button
        ref={infoButtonRef}
        type="button"
        aria-label="Informações sobre documentos"
        className="w-4 h-4 flex items-center justify-center text-teal-500 hover:text-teal-700 transition-colors focus:outline-none"
        onMouseEnter={openTooltip}
        onMouseLeave={(e) => {
          const related = e.relatedTarget as Node | null;
          if (
            tooltipRef.current &&
            related &&
            tooltipRef.current.contains(related)
          )
            return;
          setShowDocTooltip(false);
        }}
        onClick={() =>
          showDocTooltip ? setShowDocTooltip(false) : openTooltip()
        }
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M12 11v5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7.5" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {showDocTooltip && typeof window !== "undefined" && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          className="fixed z-[9999] w-64 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl leading-relaxed"
          onMouseEnter={() => setShowDocTooltip(true)}
          onMouseLeave={() => setShowDocTooltip(false)}
        >
          <div
            className="absolute -top-1.5 left-2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm"
            aria-hidden="true"
          />
          Os documentos anexados aqui serão incluídos nas{" "}
          <strong>últimas páginas</strong> do documento da solicitação cirúrgica
          gerado pelo sistema.
        </div>
      )}
    </span>
  );

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Agendamento (status 4 ou 5) — aparece antes dos dados do procedimento */}
      {(statusNum === 4 || statusNum === 5) && (
        <SchedulingSection
          solicitacao={solicitacao}
          statusNum={statusNum}
          pendingSelectedIndex={pendingDateIndex}
          onSelectDate={onSelectDate}
          onEditDateOptions={onEditDateOptions}
          onReschedule={onReschedule}
        />
      )}

      {/* Banner de contestação ativa (status 3 - Em Análise) */}
      {statusNum === 3 &&
        solicitacao.contestations?.some(
          (c: any) => c.type === "authorization" && !c.resolved_at,
        ) && (
          <div className="px-4 py-3 bg-indigo-50 rounded-xl">
            <p className="text-xs md:text-sm font-semibold text-indigo-600">
              A solicitação está em estado de contestação.
            </p>
          </div>
        )}

      {/* Dados do procedimento */}
      <EditableProcedureData
        solicitacao={solicitacao}
        onUpdate={onUpdateProcedure}
        readOnly={isReadOnly}
      />

      {/* Documentos */}
      <SectionCard title={documentTitle} headerAction={documentHeaderAction}>
        <div className="space-y-0">
          {/* Cabeçalho da tabela */}
          <div
            className={`flex items-center gap-4 px-4 py-1.5 border-b border-neutral-100${isReadOnly ? " bg-gray-50" : ""}`}
          >
            {!isReadOnly && (
              <Checkbox
                checked={
                  preSurgeryDocs.length > 0 &&
                  selectedDocuments.size === preSurgeryDocs.length
                }
                onCheckedChange={handleSelectAllDocuments}
                indeterminate={
                  selectedDocuments.size > 0 &&
                  selectedDocuments.size < preSurgeryDocs.length
                }
              />
            )}
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
          {preSurgeryDocs.length > 0 ? (
            preSurgeryDocs.map((doc: any, index: number) => (
              <div
                key={doc.id}
                className={`flex items-center gap-4 px-4 py-2${isReadOnly ? " bg-gray-50" : " hover:bg-gray-50 transition-colors"}`}
                style={
                  index < preSurgeryDocs.length - 1
                    ? { borderBottom: "1px solid #DCDFE3" }
                    : {}
                }
              >
                {!isReadOnly && (
                  <Checkbox
                    checked={selectedDocuments.has(doc.id)}
                    onCheckedChange={() => handleSelectDocument(doc.id)}
                  />
                )}
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
                </div>
                <div className="hidden sm:block w-36 flex-shrink-0 text-xs text-gray-900">
                  {new Date(doc.created_at).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="hidden sm:flex w-48 flex-shrink-0 items-center justify-between">
                  <span className="text-xs text-gray-900">
                    {formatDocumentType(doc.key)}
                  </span>
                  {!isReadOnly && (
                    <button
                      onClick={() => {
                        setDocumentToDelete(doc);
                        setIsDeleteModalOpen(true);
                      }}
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
                  )}
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

      {/* Modais */}
      {/* Dados da solicitação/análise (status ≥ 3) — última seção */}
      {statusNum >= 3 && solicitacao.analysis && (
        <AnalysisDataSection analysis={solicitacao.analysis} />
      )}

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        surgeryRequestId={surgeryRequestId}
        documentTypes={PRE_SURGERY_DOCUMENT_TYPES}
        folder={DOCUMENT_FOLDERS.PRE_SURGERY}
        onSuccess={() => {
          onDocumentsUploaded();
          setIsUploadModalOpen(false);
        }}
      />

      <DeleteDocumentModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDocumentToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        documentName={documentToDelete?.name || ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
