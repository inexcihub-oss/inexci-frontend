"use client";

import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { Upload, FileText, X, Loader2, AlertCircle, Info } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  ExtractFromDocumentResponse,
  ExtractFromDocumentJobStatusResponse,
} from "@/types/surgery-request.types";
import { getApiErrorMessage } from "@/lib/http-error";
import { prefetchScFromDocumentCatalogs } from "@/lib/sc-from-document-prefetch";
import {
  DocumentExtractionStatusPayload,
  useNotificationsContext,
} from "@/contexts/NotificationsContext";
import { BackgroundDocumentExtractionActive } from "@/lib/sc-from-document-background";

const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const POLLING_TIMEOUT_MS = 90000;
const USER_CANCELLED_SIGNAL = "__DOC_EXTRACTION_CANCELLED_BY_USER__";
const DEFAULT_ANALYSIS_ERROR_MESSAGE =
  "Não conseguimos concluir a análise do documento. Revise a qualidade do arquivo e tente novamente.";
const TIMEOUT_ERROR_MESSAGE =
  "A análise está demorando mais que o esperado. Feche este modal e tente novamente com o mesmo arquivo.";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: ExtractFromDocumentResponse) => void;
  onBackgroundProcessingStart?: (
    data: BackgroundDocumentExtractionActive,
  ) => void;
  onBackgroundProcessingReady?: (response: ExtractFromDocumentResponse) => void;
  onBackgroundProcessingError?: (message: string) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
  onBackgroundProcessingStart,
  onBackgroundProcessingReady,
  onBackgroundProcessingError,
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onDocumentExtractionStatus } = useNotificationsContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const extractionCancelledRef = useRef(false);
  const abortPendingWaitRef = useRef<(() => void) | null>(null);
  const keepTrackingInBackgroundRef = useRef(false);
  const queuedBackgroundJobRef =
    useRef<BackgroundDocumentExtractionActive | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    void prefetchScFromDocumentCatalogs();
  }, [isOpen]);

  const resetState = () => {
    setFile(null);
    setError(null);
    setLoading(false);
    extractionCancelledRef.current = true;
    abortPendingWaitRef.current?.();
    abortPendingWaitRef.current = null;
    keepTrackingInBackgroundRef.current = false;
    queuedBackgroundJobRef.current = null;
  };

  const handleClose = () => {
    if (loading) {
      keepTrackingInBackgroundRef.current = true;
      if (queuedBackgroundJobRef.current) {
        onBackgroundProcessingStart?.(queuedBackgroundJobRef.current);
      }
      onClose();
      return;
    }

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
    extractionCancelledRef.current = false;

    try {
      const queued = await surgeryRequestService.extractFromDocument(file);
      queuedBackgroundJobRef.current = {
        jobId: queued.jobId,
        fileName: file.name,
        startedAt: Date.now(),
      };
      void prefetchScFromDocumentCatalogs();

      const response = await waitForExtractionResult(queued.jobId);

      if (keepTrackingInBackgroundRef.current) {
        const responseWithFile = { ...response, originalFileName: file.name };
        resetState();
        onBackgroundProcessingReady?.(responseWithFile);
        return;
      }

      resetState();
      onSuccess({ ...response, originalFileName: file.name });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === USER_CANCELLED_SIGNAL) {
        return;
      }

      if (keepTrackingInBackgroundRef.current) {
        const message = getApiErrorMessage(err, DEFAULT_ANALYSIS_ERROR_MESSAGE);
        resetState();
        onBackgroundProcessingError?.(message);
        return;
      }

      setError(getApiErrorMessage(err, DEFAULT_ANALYSIS_ERROR_MESSAGE));
    } finally {
      if (!extractionCancelledRef.current) {
        setLoading(false);
      }
    }
  };

  const resolveTerminalStatus = (
    status: ExtractFromDocumentJobStatusResponse,
  ): ExtractFromDocumentResponse | null => {
    if (status.status === "done") return status.result;
    if (status.status === "error") {
      throw new Error(
        status.message ||
          "Não foi possível processar o documento neste momento. Tente novamente.",
      );
    }
    return null;
  };

  const waitForExtractionResult = async (
    jobId: string,
  ): Promise<ExtractFromDocumentResponse> => {
    const firstStatus =
      await surgeryRequestService.getExtractFromDocumentStatus(jobId);
    const firstResult = resolveTerminalStatus(firstStatus);
    if (firstResult) return firstResult;

    return await new Promise<ExtractFromDocumentResponse>((resolve, reject) => {
      let unsubscribeStatus = () => {};

      const finalize = () => {
        unsubscribeStatus();
        clearTimeout(timeoutId);
        abortPendingWaitRef.current = null;
      };

      abortPendingWaitRef.current = () => {
        finalize();
        reject(new Error(USER_CANCELLED_SIGNAL));
      };

      const handleStatusEvent = (payload: DocumentExtractionStatusPayload) => {
        if (payload?.jobId !== jobId) return;

        try {
          const result = resolveTerminalStatus(
            payload as ExtractFromDocumentJobStatusResponse,
          );
          if (result) {
            finalize();
            resolve(result);
          }
        } catch (err) {
          finalize();
          reject(err);
        }
      };

      const timeoutId = setTimeout(() => {
        finalize();
        reject(new Error(TIMEOUT_ERROR_MESSAGE));
      }, POLLING_TIMEOUT_MS);

      unsubscribeStatus = onDocumentExtractionStatus(handleStatusEvent);

      void (async () => {
        try {
          const liveStatus =
            await surgeryRequestService.getExtractFromDocumentStatus(jobId);
          const liveResult = resolveTerminalStatus(liveStatus);
          if (liveResult) {
            finalize();
            resolve(liveResult);
          }
        } catch (err) {
          finalize();
          reject(err);
        }
      })();
    });
  };

  useEffect(() => {
    return () => {
      extractionCancelledRef.current = true;
      abortPendingWaitRef.current?.();
      abortPendingWaitRef.current = null;
    };
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Criar solicitação a partir de documento"
      size="sm"
    >
      <div className="p-5 md:p-6 space-y-5">
        <p className="text-sm text-gray-600 leading-relaxed">
          Envie um PDF, laudo ou imagem. Vamos extrair os dados automaticamente
          e você poderá revisar tudo antes de criar a solicitação.
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
            <div>
              <p className="font-medium">Não foi possível concluir a análise</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Análise em andamento</p>
              <p>
                Isso pode levar até 1-2 minutos. Se preferir, clique em Fechar
                para continuar navegando. Quando terminar, você receberá uma
                notificação no sininho.
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!file || loading}
            className="order-1 sm:order-2 w-full sm:w-auto min-w-[140px]"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando documento
              </span>
            ) : (
              "Analisar documento"
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            className="order-2 sm:order-1 w-full sm:w-auto"
          >
            {loading ? "Fechar" : "Cancelar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
