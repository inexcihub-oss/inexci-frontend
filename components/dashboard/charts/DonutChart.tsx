"use client";

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
  centerValue: string | number;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-gray-400 text-sm">Nenhum dado</span>
      </div>
    );
  }

  let cumulativePercent = 0;
  const getCoord = (pct: number) => [
    Math.cos(2 * Math.PI * pct),
    Math.sin(2 * Math.PI * pct),
  ];

  return (
    <div className="relative flex items-center justify-center">
      <svg
        viewBox="-1.1 -1.1 2.2 2.2"
        width="180"
        height="180"
        className="transform -rotate-90"
      >
        {data
          .filter((seg) => seg.value > 0)
          .map((segment, index) => {
            const startPercent = cumulativePercent;
            const segmentPercent = segment.value / total;
            cumulativePercent += segmentPercent;

            const [startX, startY] = getCoord(startPercent);
            const [endX, endY] = getCoord(cumulativePercent);
            const largeArc = segmentPercent > 0.5 ? 1 : 0;
            const inner = 0.62;

            const pathData = [
              `M ${startX * inner} ${startY * inner}`,
              `L ${startX} ${startY}`,
              `A 1 1 0 ${largeArc} 1 ${endX} ${endY}`,
              `L ${endX * inner} ${endY * inner}`,
              `A ${inner} ${inner} 0 ${largeArc} 0 ${startX * inner} ${startY * inner}`,
            ].join(" ");

            return (
              <path
                key={index}
                d={pathData}
                fill={segment.color}
                className="transition-opacity hover:opacity-80"
              />
            );
          })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-semibold text-neutral-900 tracking-tight">
          {centerValue}
        </span>
        <span className="text-xs text-gray-500">{centerLabel}</span>
      </div>
    </div>
  );
}
