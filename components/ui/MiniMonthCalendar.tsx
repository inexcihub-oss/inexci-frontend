"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MONTHS,
  WEEKDAYS_SHORT,
  addDays,
  addMonths,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "@/lib/calendar";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  selected?: Date | null;
  onSelect: (date: Date) => void;
  initialMonth?: Date;
}

/** Calendário compacto com navegação de mês e seletor de ano. */
export function MiniMonthCalendar({ selected, onSelect, initialMonth }: Props) {
  const [mode, setMode] = useState<"days" | "years">("days");
  const [cursor, setCursor] = useState<Date>(() =>
    startOfMonth(initialMonth ?? selected ?? new Date()),
  );

  const cursorYear = cursor.getFullYear();
  const cells = Array.from({ length: 42 }, (_, i) =>
    addDays(startOfWeek(startOfMonth(cursor)), i),
  );

  // Grade de 12 anos para o seletor de ano.
  const yearsStart = Math.floor(cursorYear / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearsStart + i);

  return (
    <div className="w-64 bg-white rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() =>
            mode === "days"
              ? setCursor(addMonths(cursor, -1))
              : setCursor(new Date(cursorYear - 12, cursor.getMonth(), 1))
          }
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-600" />
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "days" ? "years" : "days")}
          className="text-sm font-semibold text-neutral-900 hover:text-teal-700 transition-colors px-2 py-1 rounded-lg hover:bg-neutral-50"
        >
          {mode === "days"
            ? `${MONTHS[cursor.getMonth()]} ${cursorYear}`
            : `${years[0]} – ${years[years.length - 1]}`}
        </button>

        <button
          type="button"
          onClick={() =>
            mode === "days"
              ? setCursor(addMonths(cursor, 1))
              : setCursor(new Date(cursorYear + 12, cursor.getMonth(), 1))
          }
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="w-4 h-4 text-neutral-600" />
        </button>
      </div>

      {mode === "days" ? (
        <>
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((w) => (
              <div
                key={w}
                className="text-center text-[11px] font-medium text-neutral-400 py-1"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const sel = selected && isSameDay(day, selected);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => onSelect(day)}
                  className={cn(
                    "h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-sm transition-colors",
                    sel
                      ? "bg-teal-600 text-white font-semibold"
                      : today
                        ? "bg-teal-50 text-teal-700 font-semibold"
                        : inMonth
                          ? "text-neutral-700 hover:bg-neutral-100"
                          : "text-neutral-300 hover:bg-neutral-50",
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2 py-2">
          {years.map((y) => {
            const isCur = y === cursorYear;
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setCursor(new Date(y, cursor.getMonth(), 1));
                  setMode("days");
                }}
                className={cn(
                  "h-9 flex items-center justify-center rounded-lg text-sm transition-colors",
                  isCur
                    ? "bg-teal-600 text-white font-semibold"
                    : "text-neutral-700 hover:bg-neutral-100",
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
