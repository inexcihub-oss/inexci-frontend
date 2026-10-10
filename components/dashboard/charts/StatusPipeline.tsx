"use client";

import {
  STATUS_ORDER,
  type ProcessedDashboard,
} from "@/components/dashboard/dashboard-data";

export function StatusPipeline({
  byStatus,
  total,
}: {
  byStatus: ProcessedDashboard["byStatus"];
  total: number;
}) {
  const statusMap = new Map(byStatus.map((s) => [s.status, s.total]));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-0.5 h-3 rounded-full overflow-hidden bg-gray-100">
        {STATUS_ORDER.map((s) => {
          const count = statusMap.get(s.num) || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={s.num}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                backgroundColor: s.color,
                minWidth: pct > 0 ? "4px" : "0",
              }}
              title={`${s.label}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map((s) => {
          const count = statusMap.get(s.num) || 0;
          return (
            <div key={s.num} className="flex items-center gap-1.5 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-gray-600">{s.label}</span>
              <span className="font-semibold text-gray-800">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
