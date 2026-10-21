"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { getApiErrorMessage } from "@/lib/http-error";
import { baixarArquivo } from "@/components/finance/reports/download";

const BOTAO_INLINE =
  "ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

interface ExportCsvButtonProps {
  onExport: () => Promise<Blob>;
  filename: string;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportCsvButton({
  onExport,
  filename,
  label = "Exportar CSV",
  ariaLabel,
  disabled = false,
  className = BOTAO_INLINE,
}: ExportCsvButtonProps) {
  const [exportando, setExportando] = useState(false);
  const { showError } = useToast();

  const exportar = async () => {
    setExportando(true);
    try {
      const blob = await onExport();
      baixarArquivo(blob, filename);
    } catch (error) {
      showError(getApiErrorMessage(error, "Não foi possível exportar o CSV."));
    } finally {
      setExportando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={disabled || exportando}
      aria-label={ariaLabel}
      className={className}
    >
      <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
      {exportando ? "Exportando..." : label}
    </button>
  );
}
