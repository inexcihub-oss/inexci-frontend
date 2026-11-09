"use client";

import { formatBrlCents, formatMonthLabel } from "@/lib/admin-format";

export interface MoneyBarSeries {
  key: string;
  label: string;
  color: string;
}

export interface MoneyBarDatum {
  month: string;
  values: Record<string, number>;
}

export function MoneyBarChart({
  data,
  series,
}: {
  data: MoneyBarDatum[];
  series: MoneyBarSeries[];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)),
  );

  return (
    <div>
      <table className="sr-only">
        <caption>Valores mensais em reais</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th scope="row">{formatMonthLabel(d.month)}</th>
              {series.map((s) => (
                <td key={s.key}>{formatBrlCents(d.values[s.key] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden="true" className="flex h-48 items-end gap-2 px-2">
        {data.map((d) => (
          <div
            key={d.month}
            data-testid="money-bar-month"
            className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"
          >
            <div className="flex flex-1 items-end justify-center gap-1">
              {series.map((s) => {
                const value = d.values[s.key] ?? 0;
                return (
                  <div
                    key={s.key}
                    title={`${s.label}: ${formatBrlCents(value)}`}
                    className="group relative flex w-full max-w-[28px] justify-center"
                    style={{
                      height: `${Math.max((value / max) * 100, 2)}%`,
                      alignSelf: "flex-end",
                    }}
                  >
                    <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                      {formatBrlCents(value)}
                    </span>
                    <div
                      data-testid={`money-bar-${s.key}`}
                      data-value={value}
                      className="h-full w-full rounded-t-md"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                );
              })}
            </div>
            <span className="w-full truncate text-center text-xs text-gray-500">
              {formatMonthLabel(d.month)}
            </span>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-4 px-2 text-xs text-gray-600">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
