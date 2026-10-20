interface MedicalReportActionsProps {
  canPreview: boolean;
  isExporting: boolean;
  onPreview: () => void;
  onExport: () => void;
}

export function MedicalReportActions({
  canPreview,
  isExporting,
  onPreview,
  onExport,
}: MedicalReportActionsProps) {
  return (
    <div
      className="flex items-center justify-end gap-2 w-full flex-wrap"
      style={{ opacity: 1, pointerEvents: "auto" }}
    >
      <button
        onClick={onPreview}
        disabled={!canPreview}
        className="flex items-center h-10 px-4 text-xs md:text-sm font-semibold text-teal-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        Pré-visualizar
      </button>
      <button
        onClick={onExport}
        disabled={isExporting || !canPreview}
        className="flex items-center h-10 px-4 bg-white border border-gray-200 shadow-sm text-xs md:text-sm font-semibold text-teal-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isExporting ? "Exportando..." : "Exportar PDF"}
      </button>
    </div>
  );
}
