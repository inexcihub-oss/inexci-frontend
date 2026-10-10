"use client";

import { useCallback, useState } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";

export function useMedicalReportPdfExport(surgeryRequestId: string | number) {
  const { showToast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const blob = await surgeryRequestService.medicalReportPdf(surgeryRequestId);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        showToast("Não foi possível abrir o PDF em uma nova aba", "error");
      }
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      showToast(getApiErrorMessage(e, "Erro ao exportar PDF"), "error");
    } finally {
      setIsExportingPdf(false);
    }
  }, [surgeryRequestId, showToast]);

  return { isExportingPdf, handleExportPdf };
}
