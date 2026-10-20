"use client";

export function HealthPlanTable({
  data,
  total,
}: {
  data: Array<{ name: string; count: number }>;
  total: number;
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <div className="grid grid-cols-[1fr_80px_80px] gap-0 px-4 py-2.5 bg-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Convênio
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
          Qtd
        </span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
          %
        </span>
      </div>
      {sorted.map((item, idx) => {
        const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
        return (
          <div
            key={item.name || idx}
            className={`grid grid-cols-[1fr_80px_80px] gap-0 px-4 py-2.5 border-t border-gray-100 ${
              idx % 2 === 1 ? "bg-gray-50/40" : ""
            }`}
          >
            <span className="text-sm text-gray-800 font-medium truncate">
              {item.name || "Sem nome"}
            </span>
            <span className="text-sm text-gray-700 text-right font-semibold">
              {item.count}
            </span>
            <span className="text-sm text-gray-500 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
