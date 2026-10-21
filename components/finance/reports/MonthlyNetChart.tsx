"use client";

import { decimalToCents, formatMoney } from "@/lib/currency";
import type { ReceiptsReportRow } from "@/types/finance.types";

export function MonthlyNetChart({ rows }: { rows: ReceiptsReportRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-44">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  const centavos = rows.map((row) => Math.max(decimalToCents(row.net), 0));
  const maior = Math.max(...centavos, 1);

  return (
    <div
      className="flex items-end gap-2 h-44 px-2"
      role="list"
      aria-label="Recebido líquido por mês"
    >
      {rows.map((row, idx) => {
        const alturaPct = (centavos[idx] / maior) * 100;
        const ultimo = idx === rows.length - 1;
        return (
          <div
            key={row.key}
            role="listitem"
            aria-label={`${row.label}: ${formatMoney(row.net)}`}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full justify-end"
          >
            <span className="text-[11px] font-semibold text-gray-800 truncate w-full text-center">
              {formatMoney(row.net)}
            </span>
            <div className="w-full flex justify-center flex-1 items-end">
              <div
                className="w-full max-w-[40px] rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max(alturaPct, 4)}%`,
                  backgroundColor: ultimo ? "#147471" : "#a7d8d6",
                  minHeight: "4px",
                }}
              />
            </div>
            <span className="text-xs text-gray-500 truncate w-full text-center">
              {row.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
