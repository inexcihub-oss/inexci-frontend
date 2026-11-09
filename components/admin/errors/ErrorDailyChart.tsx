"use client";

import { MonthlyBarChart } from "@/components/dashboard/charts/MonthlyBarChart";
import { bucketErrorDays } from "@/lib/admin-errors";
import type { AdminErrorDay } from "@/services/admin.service";
import { cn } from "@/lib/utils";

export function ErrorDailyChart({
  daily,
  fromDay,
  toDay,
  label = "Erros",
}: {
  daily: Array<Pick<AdminErrorDay, "day" | "total">>;
  fromDay: string;
  toDay: string;
  label?: string;
}) {
  const buckets = bucketErrorDays(daily, fromDay, toDay);
  const dayCount =
    Math.round((Date.parse(toDay) - Date.parse(fromDay)) / 86_400_000) + 1;
  const weekly = dayCount > 31;
  return (
    <div>
      <table className="sr-only">
        <caption>
          {label} por {weekly ? "semana" : "dia"}
        </caption>
        <thead>
          <tr>
            <th scope="col">{weekly ? "Semana de" : "Dia"}</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.label}</th>
              <td>{b.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden="true" className="overflow-x-auto">
        <div className={cn(buckets.length > 14 && "min-w-[560px]")}>
          <MonthlyBarChart
            data={buckets.map((b) => ({ month: b.label, count: b.total }))}
          />
        </div>
      </div>
    </div>
  );
}
