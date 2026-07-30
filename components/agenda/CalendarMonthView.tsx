"use client";

import { cn } from "@/lib/utils";
import {
  CalEvent,
  WEEKDAYS_SHORT,
  addDays,
  eventColors,
  hhmm,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "@/lib/calendar";

const MAX_PER_DAY = 3;

interface Props {
  anchor: Date; // qualquer dia do mês exibido
  events: CalEvent[];
  onEventClick: (ev: CalEvent) => void;
  onSelectDay: (day: Date) => void;
}

export function CalendarMonthView({
  anchor,
  events,
  onEventClick,
  onSelectDay,
}: Props) {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = anchor.getMonth();

  const eventsForDay = (day: Date) =>
    events
      .filter((e) => isSameDay(e.start, day))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* Cabeçalho de dias da semana */}
      <div className="grid grid-cols-7 border-b border-neutral-100 shrink-0">
        {WEEKDAYS_SHORT.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[11px] font-medium text-neutral-400 uppercase"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grade 6x7 */}
      <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-[520px]">
        {cells.map((day) => {
          const inMonth = day.getMonth() === month;
          const dayEvents = eventsForDay(day);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                "text-left border-r border-b border-neutral-100 p-1.5 flex flex-col gap-1 overflow-hidden hover:bg-neutral-50 transition-colors",
                !inMonth && "bg-neutral-50/40",
              )}
            >
              <div
                className={cn(
                  "self-start w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold shrink-0",
                  today
                    ? "bg-teal-600 text-white"
                    : inMonth
                      ? "text-neutral-700"
                      : "text-neutral-300",
                )}
              >
                {day.getDate()}
              </div>

              <div className="flex flex-col gap-0.5 w-full">
                {dayEvents.slice(0, MAX_PER_DAY).map((ev) => {
                  const c = eventColors(ev);
                  return (
                    <span
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      className={cn(
                        "flex items-center gap-1 text-[11px] rounded px-1 py-0.5 truncate cursor-pointer border",
                        c.bg,
                        c.text,
                        c.border,
                      )}
                      title={`${hhmm(ev.start)} ${ev.title}`}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.bar)} />
                      <span className="truncate">
                        {!ev.allDay && (
                          <span className="tabular-nums">{hhmm(ev.start)} </span>
                        )}
                        {ev.title}
                      </span>
                    </span>
                  );
                })}
                {dayEvents.length > MAX_PER_DAY && (
                  <span className="text-[10px] text-neutral-400 pl-1">
                    +{dayEvents.length - MAX_PER_DAY} mais
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
