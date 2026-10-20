"use client";

import React from "react";
import { IconCalendar, IconClock } from "./SurgeryStatusIcons";

interface SurgeryRescheduleFieldsProps {
  newDate: string;
  newTime: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}

export function SurgeryRescheduleFields({
  newDate,
  newTime,
  onDateChange,
  onTimeChange,
}: SurgeryRescheduleFieldsProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-5 md:px-6 md:py-6">
      <p className="text-xs md:text-sm text-neutral-500">
        Selecione a nova data e horário para a cirurgia.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="ds-label mb-0 flex items-center gap-1.5">
            <IconCalendar size={14} />
            Data
          </label>
          <div className="relative">
            <div
              className={`ds-input flex items-center justify-between cursor-pointer ${
                newDate ? "text-gray-900" : "text-gray-400"
              }`}
            >
              <span className="text-sm leading-tight">
                {newDate
                  ? new Date(`${newDate}T00:00`).toLocaleDateString("pt-BR")
                  : "dd/mm/aaaa"}
              </span>
            </div>
            <input
              type="date"
              value={newDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="ds-label mb-0 flex items-center gap-1.5">
            <IconClock size={14} />
            Horário
          </label>
          <div className="ds-input flex items-center gap-2">
            <input
              type="time"
              value={newTime}
              onChange={(e) => onTimeChange(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 min-w-0"
            />
          </div>
        </div>
      </div>

      {newDate && (
        <div className="flex items-center gap-3 px-4 py-3.5 bg-primary-50 border border-primary-100 rounded-xl">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-700 text-white flex-shrink-0">
            <IconCalendar size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-neutral-500 font-medium">
              Nova data da cirurgia
            </span>
            <span className="text-sm font-semibold text-neutral-900">
              {new Date(`${newDate}T00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              {newTime && (
                <span className="text-neutral-500 font-normal">
                  {" "}
                  · {newTime}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
