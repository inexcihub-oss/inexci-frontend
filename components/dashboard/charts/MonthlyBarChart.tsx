"use client";

import type { MonthlyEvolutionData } from "@/services/reports.service";

export function MonthlyBarChart({ data }: { data: MonthlyEvolutionData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-44">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-44 px-2">
      {data.map((item, idx) => {
        const heightPct = (item.count / maxCount) * 100;
        const isLast = idx === data.length - 1;
        return (
          <div
            key={idx}
            className="flex-1 flex flex-col items-center gap-1 min-w-0"
          >
            <span className="text-xs font-semibold text-gray-800">
              {item.count}
            </span>
            <div className="w-full flex justify-center">
              <div
                className="w-full max-w-[40px] rounded-t-md transition-all duration-500"
                style={{
                  height: `${Math.max(heightPct, 4)}%`,
                  backgroundColor: isLast ? "#147471" : "#a7d8d6",
                  minHeight: "4px",
                }}
              />
            </div>
            <span className="text-xs text-gray-500 truncate w-full text-center">
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  );
}
