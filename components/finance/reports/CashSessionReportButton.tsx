"use client";

import { ExportCsvButton } from "@/components/finance/reports/ExportCsvButton";
import { financeService } from "@/services/finance.service";

export interface CashSessionReportButtonProps {
  sessionId: string;
}

export function CashSessionReportButton({
  sessionId,
}: CashSessionReportButtonProps) {
  return (
    <ExportCsvButton
      label="Exportar fechamento"
      filename={`fechamento-caixa-${sessionId}.csv`}
      onExport={() => financeService.exportCashSessionReportCsv(sessionId)}
    />
  );
}
