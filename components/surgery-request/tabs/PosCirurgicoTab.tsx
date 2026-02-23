"use client";

import React, { useState } from "react";
import { documentService } from "@/services/document.service";
import {
  DocumentUploadModal,
  POST_SURGERY_DOCUMENT_TYPES,
} from "@/components/documents/DocumentUploadModal";
import { DeleteDocumentModal } from "@/components/documents/DeleteDocumentModal";
import { SectionCard } from "@/components/shared/SectionCard";
import { useToast } from "@/hooks/useToast";

interface PosCirurgicoTabProps {
  solicitacao: any;
  onUpdate: () => void;
}

const POST_DOC_TYPE_LABELS: Record<string, string> = {
  surgery_room: "Descrição cirúrgica",
  surgery_images: "Imagens",
  surgery_auth_document: "Documento de autorização",
  post_surgery_document: "Outros",
  additional_document: "Outros",
};

const POST_DOC_KEYS = Object.keys(POST_DOC_TYPE_LABELS);

function formatPostDocType(key: string): string {
  return POST_DOC_TYPE_LABELS[key] ?? key;
}

/** Formata data como "21 Set 2025" usando horário local */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Formata hora como "10:00" usando horário local */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  if (hours === "00" && minutes === "00") return "—";
  return `${hours}:${minutes}`;
}

/**
 * Aba "Pós Cirúrgico" — disponível a partir do status 6 (Realizada).
 * Exibe a data da cirurgia e os documentos pós-cirúrgicos associados.
 * Permite adicionar e remover documentos do tipo pós-cirúrgico.
 *
 * Referências:
 *   - telas-inexci/status/realizada/tela-detalhes-status-realizada-aba-pos-cirurgico.png
 *   - telas-inexci/status/realizada/modal-add-documento-aba-pos-cirurgico.png
 */
export function PosCirurgicoTab({
  solicitacao,
  onUpdate,
}: PosCirurgicoTabProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const postSurgeryDocs = React.useMemo(
    () =>
      (solicitacao.documents ?? []).filter((d: any) =>
        POST_DOC_KEYS.includes(d.type),
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
      showToast("Documento removido com sucesso", "success");
      onUpdate();
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch {
      showToast("Erro ao remover documento", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const headerAction = (
    <button
      onClick={() => setIsUploadModalOpen(true)}
      className="flex items-center justify-center font-semibold text-black bg-transparent border border-neutral-100 hover:bg-gray-50 transition-colors py-1.5 px-3 rounded-lg text-sm leading-normal"
    >
      Adicionar
    </button>
  );

  const performedAt: string | null = solicitacao.surgery_performed_at ?? null;

  return (
    <div className="space-y-2.5">
      {/* ── Seção: Data da realização ──────────────────────────────────────── */}
      <SectionCard title="Data da realização">
        {performedAt ? (
          <div className="p-4">
            <div className="flex border border-neutral-100 rounded-lg overflow-hidden">
              {/* Data */}
              <div className="flex-1 flex flex-col items-center gap-2 px-6 py-5 bg-neutral-50">
                <span className="text-sm text-black/50">Data</span>
                <span className="text-2xl font-bold text-black">
                  {formatDate(performedAt)}
                </span>
              </div>
              {/* Divisor vertical */}
              <div className="w-px bg-neutral-100 self-stretch" />
              {/* Horário */}
              <div className="flex-1 flex flex-col items-center gap-2 px-6 py-5 bg-neutral-50">
                <span className="text-sm text-black/50">Horário</span>
                <span className="text-2xl font-bold text-black">
                  {formatTime(performedAt)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center p-4">
            Data de realização não informada.
          </p>
        )}
      </SectionCard>

      {/* ── Seção: Documentos pós cirúrgicos ───────────────────────────────── */}
      <SectionCard
        title="Documentos pós cirúrgicos"
        headerAction={headerAction}
      >
        {/* Cabeçalho da tabela */}
        <div className="flex items-center gap-4 px-4 py-1.5 border-b border-neutral-100">
          <div className="flex-1 text-xs text-gray-900 opacity-70">Tipo</div>
          <div className="flex-1 text-xs text-gray-900 opacity-70">
            Tipo do arquivo:
          </div>
          <div className="flex-1 text-xs text-gray-900 opacity-70">
            Anexado em:
          </div>
          <div className="w-8" />
        </div>

        {/* Linhas de documentos */}
        {postSurgeryDocs.length > 0 ? (
          postSurgeryDocs.map((doc: any) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 px-4 py-3 border-b border-neutral-100 hover:bg-gray-50 last:border-b-0"
            >
              {/* Tipo (nome do arquivo) */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <svg
                  className="w-5 h-5 text-gray-500 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M5 3V21H19V7.828L14.172 3H5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 3V8H19"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
                  {doc.size && (
                    <span className="font-normal text-blue-500 ml-1">
                      ({Math.round(doc.size / 1024 / 1024) || 1}MB)
                    </span>
                  )}
                </a>
              </div>

              {/* Tipo do arquivo */}
              <div className="flex-1 text-xs text-gray-900">
                {formatPostDocType(doc.type)}
              </div>

              {/* Anexado em */}
              <div className="flex-1 text-xs text-gray-900">
                {new Date(doc.created_at).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>

              {/* Ações */}
              <div className="w-8 flex justify-center">
                <button
                  onClick={() => {
                    setDocumentToDelete(doc);
                    setIsDeleteModalOpen(true);
                  }}
                  className="w-6 h-6 flex items-center justify-center border border-neutral-100 rounded hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm"
                  aria-label="Mais opções"
                >
                  <svg
                    className="w-3.5 h-3.5 text-gray-500"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <circle cx="4" cy="8" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="12" cy="8" r="1.5" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            Nenhum documento pós-cirúrgico adicionado
          </div>
        )}
      </SectionCard>

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        surgeryRequestId={solicitacao.id}
        onSuccess={() => {
          onUpdate();
          setIsUploadModalOpen(false);
        }}
        documentTypes={POST_SURGERY_DOCUMENT_TYPES}
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
        documentName={documentToDelete?.name ?? ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
