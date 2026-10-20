"use client";

import React from "react";

export interface ScheduleDateOption {
  date: string;
  time: string;
}

interface SchedulingOptionsStepProps {
  dates: ScheduleDateOption[];
  attempted: boolean;
  onChange: (dates: ScheduleDateOption[]) => void;
}

export function SchedulingOptionsStep({
  dates,
  attempted,
  onChange,
}: SchedulingOptionsStepProps) {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-5 overflow-y-auto">
      <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-3.5">
        <div className="shrink-0 w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-blue-700 leading-relaxed">
          Informe até <strong className="font-semibold">3 opções</strong> de
          data e horário. Elas são{" "}
          <strong className="font-semibold">opcionais</strong> — você pode
          defini-las depois, já em Agendamento. O paciente escolherá a que
          melhor se encaixa na sua agenda.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {(
          [
            {
              label: "1ª opção",
              sublabel: "Preferencial",
              color: "text-primary-700 bg-primary-50 border-primary-100",
            },
            {
              label: "2ª opção",
              sublabel: "Alternativa",
              color: "text-gray-600 bg-gray-50 border-gray-100",
            },
            {
              label: "3ª opção",
              sublabel: "Alternativa",
              color: "text-gray-600 bg-gray-50 border-gray-100",
            },
          ] as const
        ).map(({ label, sublabel, color }, index) => {
          const dateVal = dates[index].date;
          const timeVal = dates[index].time;
          const filled = dateVal !== "" && timeVal !== "";
          const dateError = attempted && dateVal === "" && timeVal !== "";
          const timeError = attempted && timeVal === "" && dateVal !== "";
          const hasError = dateError || timeError;
          return (
            <div
              key={index}
              className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors duration-200 ${
                hasError
                  ? "border-red-300 bg-red-50/30"
                  : filled
                    ? "border-primary-200 bg-primary-50/30"
                    : "border-neutral-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold border ${color}`}
                >
                  {index + 1}
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-900 leading-none">
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {sublabel}
                  </span>
                </div>
                {filled && (
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 border border-primary-100 rounded-full px-2 py-0.5">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Preenchida
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label
                    className={`text-xs font-medium ${dateError ? "text-red-500" : "text-gray-500"}`}
                  >
                    Data{dateError && " *"}
                  </label>
                  <input
                    type="date"
                    value={dates[index].date}
                    onChange={(e) => {
                      const next = [...dates];
                      next[index] = {
                        ...next[index],
                        date: e.target.value,
                      };
                      onChange(next);
                    }}
                    className={`ds-input ${dateError ? "border-red-400 focus:ring-red-400" : ""}`}
                  />
                  {dateError && (
                    <p className="text-xs text-red-500">Obrigatório</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    className={`text-xs font-medium ${timeError ? "text-red-500" : "text-gray-500"}`}
                  >
                    Horário{timeError && " *"}
                  </label>
                  <input
                    type="time"
                    value={dates[index].time}
                    onChange={(e) => {
                      const next = [...dates];
                      next[index] = {
                        ...next[index],
                        time: e.target.value,
                      };
                      onChange(next);
                    }}
                    className={`ds-input ${timeError ? "border-red-400 focus:ring-red-400" : ""}`}
                  />
                  {timeError && (
                    <p className="text-xs text-red-500">Obrigatório</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
