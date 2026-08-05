"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CalEvent,
  WEEKDAYS_SHORT,
  eventColors,
  hhmm,
  isToday,
  isSameDay,
  layoutOverlaps,
} from "@/lib/calendar";

const HOUR_PX = 52;
const HOUR_START = 0;
const HOUR_END = 23;

interface Props {
  days: Date[];
  events: CalEvent[];
  onEventClick: (ev: CalEvent) => void;
  onSlotClick: (date: Date) => void;
}

export function CalendarTimeGrid({
  days,
  events,
  onEventClick,
  onSlotClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const hours = Array.from(
    { length: HOUR_END - HOUR_START + 1 },
    (_, i) => HOUR_START + i,
  );
  const bodyHeight = (HOUR_END - HOUR_START) * HOUR_PX;

  // Detecta telas estreitas para caber as colunas sem scroll horizontal.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Rola para ~7h ao montar para começar num horário útil.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (7 - HOUR_START) * HOUR_PX - 8);
    }
  }, []);

  const gutter = narrow ? 40 : 56;
  const minCol = narrow ? 0 : 120;
  const gridCols = {
    gridTemplateColumns: `${gutter}px repeat(${days.length}, minmax(${minCol}px, 1fr))`,
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - HOUR_START * 60) / 60) * HOUR_PX;
  const showNow = nowMinutes >= HOUR_START * 60 && nowMinutes <= HOUR_END * 60;

  const allDayByDay = days.map((day) =>
    events.filter((e) => e.allDay && isSameDay(e.start, day)),
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);

  const handleSlotClick = (
    e: React.MouseEvent<HTMLDivElement>,
    day: Date,
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let minutes = Math.round((y / HOUR_PX) * 60);
    minutes = Math.max(0, Math.round(minutes / 30) * 30);
    const date = new Date(day);
    date.setHours(HOUR_START, 0, 0, 0);
    date.setMinutes(date.getMinutes() + minutes);
    onSlotClick(date);
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      {/* Cabeçalho (dias + all-day) — sticky */}
      <div
        className="grid sticky top-0 z-20 bg-white border-b border-neutral-100"
        style={gridCols}
      >
        <div className="border-r border-neutral-100" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={`h-${day.toISOString()}`}
              className="border-r border-neutral-100 py-2 text-center"
            >
              <p className="text-[11px] font-medium text-neutral-400 uppercase">
                {WEEKDAYS_SHORT[day.getDay()]}
              </p>
              <div
                className={cn(
                  "mx-auto mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold",
                  today ? "bg-teal-600 text-white" : "text-neutral-800",
                )}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}

        {hasAllDay && (
          <>
            <div className="border-r border-t border-neutral-100 flex items-center justify-center py-1">
              <span className="text-[9px] text-neutral-400 uppercase tracking-wide">
                Dia todo
              </span>
            </div>
            {days.map((day, i) => (
              <div
                key={`ad-${day.toISOString()}`}
                className="border-r border-t border-neutral-100 p-1 flex flex-col gap-1 min-h-[32px]"
              >
                {allDayByDay[i].map((ev) => {
                  const c = eventColors(ev);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={cn(
                        "text-left text-[11px] rounded-md px-1.5 py-0.5 border truncate",
                        c.bg,
                        c.text,
                        c.border,
                      )}
                      title={ev.title}
                    >
                      {ev.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Corpo com grade horária */}
      <div className="grid" style={gridCols}>
        {/* Coluna de horários */}
        <div className="relative" style={{ height: bodyHeight }}>
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute right-1.5 -translate-y-1/2 text-[11px] text-neutral-400"
              style={{ top: i * HOUR_PX }}
            >
              {i > 0 ? `${h.toString().padStart(2, "0")}:00` : ""}
            </div>
          ))}
        </div>

        {/* Colunas de dias */}
        {days.map((day) => {
          const dayEvents = events.filter(
            (e) => !e.allDay && isSameDay(e.start, day),
          );
          const positioned = layoutOverlaps(dayEvents);

          return (
            <div
              key={`c-${day.toISOString()}`}
              className="relative border-r border-neutral-100"
              style={{ height: bodyHeight }}
            >
              {/* Linhas de hora (clicáveis para criar) */}
              <div
                className="absolute inset-0 cursor-pointer"
                onClick={(e) => handleSlotClick(e, day)}
              >
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-neutral-100"
                    style={{ top: i * HOUR_PX }}
                  />
                ))}
              </div>

              {/* Linha do horário atual */}
              {isToday(day) && showNow && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: nowTop }}
                >
                  <div className="relative">
                    <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                    <div className="border-t border-red-500" />
                  </div>
                </div>
              )}

              {/* Eventos */}
              {positioned.map(({ event: ev, col, cols }) => {
                const startMin =
                  ev.start.getHours() * 60 + ev.start.getMinutes();
                const endMin = Math.min(
                  ev.end.getHours() * 60 + ev.end.getMinutes() ||
                    HOUR_END * 60,
                  HOUR_END * 60,
                );
                const top = Math.max(
                  0,
                  ((startMin - HOUR_START * 60) / 60) * HOUR_PX,
                );
                const height = Math.max(
                  20,
                  ((endMin - startMin) / 60) * HOUR_PX - 2,
                );
                const c = eventColors(ev);
                const widthPct = 100 / cols;

                return (
                  <button
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className={cn(
                      "absolute rounded-lg border pl-2 pr-1 py-0.5 text-left overflow-hidden shadow-sm z-10",
                      c.bg,
                      c.border,
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${col * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                    title={`${hhmm(ev.start)} · ${ev.title}`}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
                        c.bar,
                      )}
                    />
                    <p className={cn("text-[11px] font-semibold truncate", c.text)}>
                      {hhmm(ev.start)} {ev.title}
                    </p>
                    {height > 32 && (
                      <p className="text-[10px] text-neutral-500 truncate">
                        {ev.subtitle}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
