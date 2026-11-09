"use client";

import { useEffect, useMemo, useState } from "react";
import { addDaysISO, spDayStart, spTodayISODate } from "@/lib/calendar-date";
import { ADMIN_FILTER_CONTROL } from "@/components/admin/AdminFilters";
import { cn } from "@/lib/utils";

export type PeriodKey = "7d" | "30d" | "90d" | "month" | "custom";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  month: "Mês atual",
  custom: "Personalizado",
};

const PRESET_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

export interface AdminPeriodRange {
  from: string;
  to: string;
}

export interface AdminPeriodState {
  period: PeriodKey;
  setPeriod: (period: PeriodKey) => void;
  customFrom: string;
  setCustomFrom: (value: string) => void;
  customTo: string;
  setCustomTo: (value: string) => void;
  range: AdminPeriodRange | null;
  presets: PeriodKey[];
}

export function useAdminPeriod(
  initial: PeriodKey = "30d",
  presets: PeriodKey[] = ["7d", "30d", "90d", "custom"],
): AdminPeriodState {
  const [period, setPeriod] = useState<PeriodKey>(initial);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [today, setToday] = useState(spTodayISODate);

  useEffect(() => {
    const id = window.setInterval(() => setToday(spTodayISODate()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const range = useMemo<AdminPeriodRange | null>(() => {
    if (period === "custom") {
      if (!customFrom || !customTo) return null;
      const [from, to] =
        customFrom > customTo ? [customTo, customFrom] : [customFrom, customTo];
      return { from: spDayStart(from), to: spDayStart(addDaysISO(to, 1)) };
    }
    if (period === "month") {
      return {
        from: spDayStart(`${today.slice(0, 8)}01`),
        to: spDayStart(addDaysISO(today, 1)),
      };
    }
    return {
      from: spDayStart(addDaysISO(today, 1 - PRESET_DAYS[period])),
      to: spDayStart(addDaysISO(today, 1)),
    };
  }, [period, customFrom, customTo, today]);

  return {
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    range,
    presets,
  };
}

export function AdminPeriodFilter({ state }: { state: AdminPeriodState }) {
  return (
    <>
      <div className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0">
        <div role="group" aria-label="Período" className="ds-segmented">
          {state.presets.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={state.period === id}
              onClick={() => state.setPeriod(id)}
              className={cn(
                "ds-segmented-item whitespace-nowrap",
                state.period === id && "ds-segmented-item-active",
              )}
            >
              {PERIOD_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      {state.period === "custom" && (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-700 sm:flex-row sm:items-center sm:gap-1.5 md:text-sm">
            De
            <input
              type="date"
              aria-label="De"
              className={ADMIN_FILTER_CONTROL}
              value={state.customFrom}
              onChange={(e) => state.setCustomFrom(e.target.value)}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs text-gray-700 sm:flex-row sm:items-center sm:gap-1.5 md:text-sm">
            Até
            <input
              type="date"
              aria-label="Até"
              className={ADMIN_FILTER_CONTROL}
              value={state.customTo}
              onChange={(e) => state.setCustomTo(e.target.value)}
            />
          </label>
        </div>
      )}
    </>
  );
}
