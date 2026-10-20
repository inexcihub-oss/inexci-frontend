"use client";

import { useEffect, useRef } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import type { ExtractFromDocumentResponse } from "@/types/surgery-request.types";
import type { ToastType } from "@/types/toast.types";

export const DOC_EXTRACTION_MESSAGES = {
  error: "Não foi possível concluir a análise do documento. Tente novamente.",
  processing:
    "A análise do documento ainda está em andamento. Você receberá uma notificação quando concluir.",
  fetchFailed:
    "Não foi possível recuperar a análise do documento agora. Tente novamente.",
} as const;

interface UseDocExtractionJobOptions {
  enabled?: boolean;
  onStart?: () => void;
  onDone: (result: ExtractFromDocumentResponse) => void;
  onNotDone?: () => void;
  notify: (message: string, type: ToastType) => void;
}

export function useDocExtractionJob(
  jobId: string | null,
  {
    enabled = true,
    onStart,
    onDone,
    onNotDone,
    notify,
  }: UseDocExtractionJobOptions,
): void {
  const callbacks = useRef({ onStart, onDone, onNotDone, notify });
  callbacks.current = { onStart, onDone, onNotDone, notify };

  useEffect(() => {
    if (!jobId || !enabled) return;

    callbacks.current.onStart?.();

    let cancelled = false;
    void (async () => {
      try {
        const status =
          await surgeryRequestService.getExtractFromDocumentStatus(jobId);
        if (cancelled) return;
        const cb = callbacks.current;

        if (status.status === "done") {
          cb.onDone(status.result);
          return;
        }

        if (status.status === "error") {
          cb.notify(status.message || DOC_EXTRACTION_MESSAGES.error, "error");
        } else {
          cb.notify(DOC_EXTRACTION_MESSAGES.processing, "info");
        }
        cb.onNotDone?.();
      } catch {
        if (cancelled) return;
        callbacks.current.notify(DOC_EXTRACTION_MESSAGES.fetchFailed, "error");
        callbacks.current.onNotDone?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, enabled]);
}
