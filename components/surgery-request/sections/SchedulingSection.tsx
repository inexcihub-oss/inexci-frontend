"use client";

import React from "react";

interface SchedulingSectionProps {
  solicitacao: any;
  statusNum: number;
  pendingSelectedIndex: number | null;
  onSelectDate: (index: number) => void;
  onEditDateOptions: () => void;
  onReschedule: () => void;
}

const ORDINALS = ["1ª", "2ª", "3ª"];

/** Formata data como "21 Set 2025" usando horário local */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, "0");
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Formata hora como "10:00" usando horário local */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  // Se a data não tiver hora (meia-noite), exibe "—"
  if (hours === "00" && minutes === "00") return "—";
  return `${hours}:${minutes}`;
}

/**
 * Seção de agendamento exibida em Informações Gerais nos status 4 e 5.
 *
 * - Status 4 (Em Agendamento): exibe as 3 opções de data em grid com radio buttons,
 *   botão "Editar" e botão "Confirmar" — fiel ao design do Figma.
 * - Status 5 (Agendada): exibe a data confirmada em destaque com botão "Reagendar".
 */
export function SchedulingSection({
  solicitacao,
  statusNum,
  pendingSelectedIndex,
  onSelectDate,
  onEditDateOptions,
  onReschedule,
}: SchedulingSectionProps) {
  const dateOptions: string[] =
    solicitacao?.scheduling?.date_options ?? solicitacao?.date_options ?? [];

  const surgeryDate: string | null =
    solicitacao?.surgery_date ??
    solicitacao?.scheduling?.confirmed_date ??
    null;

  // Índice confirmado pelo backend (usado apenas para referência)
  // A seleção pendente do usuário vem via prop pendingSelectedIndex

  // ── Status 4 — Em Agendamento ─────────────────────────────────────────────
  if (statusNum === 4) {
    return (
      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pr-4 border-b border-neutral-100">
          {/* Título + badge */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-3 sm:py-4">
            <h3 className="ds-section-title">Agendamento</h3>
            {dateOptions.length > 0 && (
              <span className="bg-[#EBF3FF] text-[#1D7AFC] text-xs font-semibold px-2 py-1 rounded-sm leading-none">
                Aguardando paciente escolher a melhor opção.
              </span>
            )}
          </div>

          {/* Botões */}
          <div className="flex items-center gap-2">
            <button onClick={onEditDateOptions} className="ds-btn-inline">
              Editar
            </button>
          </div>
        </div>

        {/* Corpo — grid de opções */}
        <div className="p-4">
          {dateOptions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Nenhuma data proposta ainda. Clique em &quot;Editar&quot; para
              adicionar.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {dateOptions.map((date, index) => {
                const isSelected = pendingSelectedIndex === index;
                return (
                  <div
                    key={index}
                    onClick={() => onSelectDate(index)}
                    className={`flex flex-col rounded overflow-hidden cursor-pointer transition-colors ${
                      isSelected
                        ? "border-2 border-teal-600 bg-neutral-50"
                        : "border border-neutral-100 bg-neutral-50 hover:border-neutral-300"
                    }`}
                  >
                    {/* Cabeçalho do card */}
                    <div className="flex items-center justify-between px-2.5 py-2.5 bg-white border-b border-neutral-100">
                      <span className="text-sm font-semibold text-black/50 leading-5 flex-1">
                        {ORDINALS[index]} Opção
                      </span>
                      {/* Radio button */}
                      {isSelected ? (
                        /* Checked */
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="flex-shrink-0"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="9"
                            stroke="#111111"
                            strokeWidth="1.5"
                          />
                          <circle cx="10" cy="10" r="5" fill="#111111" />
                        </svg>
                      ) : (
                        /* Unchecked */
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          className="flex-shrink-0"
                        >
                          <circle
                            cx="10"
                            cy="10"
                            r="9"
                            stroke="#111111"
                            strokeWidth="1.5"
                            opacity="0.3"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Corpo do card — Data e Horário */}
                    <div className="flex">
                      {/* Data */}
                      <div className="flex-1 flex flex-col gap-2 p-2.5 bg-neutral-50">
                        <span className="text-sm text-black/50 w-full">
                          Data
                        </span>
                        <span className="text-xl font-light tracking-tight leading-tight w-full">
                          {formatDate(date)}
                        </span>
                      </div>
                      {/* Divisor vertical */}
                      <div className="w-px bg-neutral-100 self-stretch" />
                      {/* Horário */}
                      <div className="flex-1 flex flex-col gap-2 p-2.5 bg-neutral-50">
                        <span className="text-sm text-black/50 w-full">
                          Horário
                        </span>
                        <span className="text-xl font-light tracking-tight leading-tight w-full">
                          {formatTime(date)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Status 5 — Agendada ───────────────────────────────────────────────────
  if (statusNum === 5) {
    return (
      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pr-4 border-b border-neutral-100">
          <div className="flex items-center gap-3 px-3 py-4">
            <h3 className="ds-section-title">Agendamento</h3>
          </div>
          <button onClick={onReschedule} className="ds-btn-inline">
            Editar
          </button>
        </div>

        {/* Data confirmada */}
        {surgeryDate ? (
          <div className="p-4">
            <div className="flex flex-col sm:flex-row border border-neutral-100 rounded-xl overflow-hidden">
              {/* Data */}
              <div className="flex-1 flex flex-col items-center gap-2 px-4 py-3 md:px-6 md:py-4 sm:py-5 bg-neutral-50">
                <span className="text-sm text-black/50">Data</span>
                <span className="text-xl sm:text-2xl font-bold text-black">
                  {formatDate(surgeryDate)}
                </span>
              </div>
              {/* Divisor */}
              <div className="h-px sm:h-auto sm:w-px bg-neutral-100" />
              {/* Horário */}
              <div className="flex-1 flex flex-col items-center gap-2 px-4 py-3 md:px-6 md:py-4 sm:py-5 bg-neutral-50">
                <span className="text-sm text-black/50">Horário</span>
                <span className="text-xl sm:text-2xl font-bold text-black">
                  {formatTime(surgeryDate)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center p-4">
            Nenhuma data confirmada.
          </p>
        )}
      </div>
    );
  }

  return null;
}
