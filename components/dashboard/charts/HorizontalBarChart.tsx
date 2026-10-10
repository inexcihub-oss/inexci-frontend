"use client";

export function HorizontalBarChart({
  data,
  barColor = "#147471",
  maxItems = 6,
}: {
  data: Array<{ name: string; count: number }>;
  barColor?: string;
  maxItems?: number;
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, maxItems);
  const maxValue = Math.max(...sorted.map((d) => d.count), 1);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sorted.map((item, idx) => {
        const pct = (item.count / maxValue) * 100;
        return (
          <div key={idx} className="flex items-center gap-3">
            <span
              className="text-sm text-gray-700 font-medium truncate"
              style={{ width: "120px", minWidth: "120px" }}
              title={item.name}
            >
              {item.name || "Sem nome"}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-800 w-8 text-right">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
