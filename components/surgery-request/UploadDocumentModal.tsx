"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import { getApiErrorMessage } from "@/lib/http-error";
import { prefetchScFromDocumentCatalogs } from "@/lib/sc-from-document-prefetch";

const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: ExtractFromDocumentResponse) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    void prefetchScFromDocumentCatalogs();
  }, [isOpen]);

  const resetState = () => {
    setFile(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_MIME.includes(f.type)) {
      return "Formato não suportado. Use PDF, JPG, PNG ou WEBP.";
    }
    if (f.size > MAX_BYTES) {
      return `Arquivo muito grande. O máximo permitido é ${formatBytes(MAX_BYTES)}.`;
    }
    return null;
  };

  const applyFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) applyFile(f);
    // Limpa o input para permitir re-seleção do mesmo arquivo
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const [response] = await Promise.all([
        surgeryRequestService.extractFromDocument(file),
        prefetchScFromDocumentCatalogs(),
      ]);
      resetState();
      onSuccess({ ...response, originalFileName: file.name });
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível analisar o documento. Verifique a qualidade do arquivo e tente novamente.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Criar solicitação a partir de documento"
      size="sm"
    >
      <div className="p-5 md:p-6 space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          Envie um PDF, laudo ou imagem. A plataforma extrai os dados via IA e
          permite que você revise antes de criar a solicitação.
        </p>

        {/* Área de drop */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Área de upload de documento"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          className={[
            "cursor-pointer border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-colors",
            dragging
              ? "border-teal-400 bg-teal-50"
              : "border-neutral-200 hover:border-neutral-300",
            loading ? "pointer-events-none opacity-60" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleInputChange}
            disabled={loading}
          />

          {file ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Remover arquivo"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!loading) setFile(null);
                }}
                className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
                disabled={loading}
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-9 h-9 text-neutral-300" />
              <div className="text-center">
                <p className="text-sm font-semibold text-teal-600">
                  Clique para selecionar
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  ou arraste e solte aqui
                </p>
              </div>
              <p className="text-xs text-neutral-400">
                PDF, JPG, PNG, WEBP — máx. 10 MB
              </p>
            </>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!file || loading}
            className="w-full sm:w-auto min-w-[140px]"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </span>
            ) : (
              "Analisar documento"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
