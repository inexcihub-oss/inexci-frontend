"use client";

export function AreaLineChart({
  data,
  height = 140,
}: {
  data: Array<{ date: string; value: number }>;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <span className="text-gray-400 text-sm">Dados insuficientes</span>
      </div>
    );
  }

  const width = 480;
  const pad = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;
  const highlightIndices = Array.from(
    new Set([0, Math.floor(points.length / 2), points.length - 1]),
  ).filter((idx) => idx >= 0 && idx < points.length);

  const fmtLabel = (dateStr: string) => {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="dashAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#147471" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#147471" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((pct) => (
        <line
          key={pct}
          x1={pad.left}
          y1={pad.top + chartH * (1 - pct)}
          x2={pad.left + chartW}
          y2={pad.top + chartH * (1 - pct)}
          stroke="#f3f4f6"
          strokeDasharray="4 4"
        />
      ))}
      <path d={areaPath} fill="url(#dashAreaGradient)" />
      <path
        d={linePath}
        fill="none"
        stroke="#147471"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {highlightIndices.map((idx) => (
        <circle
          key={`highlight-${idx}`}
          cx={points[idx].x}
          cy={points[idx].y}
          r="3.5"
          fill="#147471"
          stroke="white"
          strokeWidth="2"
        />
      ))}
      <text
        x={pad.left}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="start"
      >
        {fmtLabel(data[0].date)}
      </text>
      <text
        x={pad.left + chartW / 2}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="middle"
      >
        {fmtLabel(data[Math.floor(data.length / 2)].date)}
      </text>
      <text
        x={pad.left + chartW}
        y={height - 4}
        fontSize="11"
        fill="#9ca3af"
        textAnchor="end"
      >
        {fmtLabel(data[data.length - 1].date)}
      </text>
    </svg>
  );
}
