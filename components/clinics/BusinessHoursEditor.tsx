"use client";

import { Plus, X } from "lucide-react";
import {
  BusinessHours,
  MAX_BLOCKS_PER_DAY,
  TIME_PATTERN,
  TimeBlock,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  WeekdayKey,
  fromMinutes,
  toMinutes,
} from "@/lib/business-hours";

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (hours: BusinessHours) => void;
  disabled?: boolean;
}

const BLOCO_PADRAO: TimeBlock = { start: "08:00", end: "18:00" };
const FIM_DO_DIA_MINUTOS = 23 * 60 + 59;

/**
 * Bloco novo a partir do fim do último existente (início = fim do último,
 * fim = uma hora depois, sem passar de 23:59). Um bloco fixo em 08:00–18:00
 * nasceria sobreposto quando já existe um bloco no dia, e a linha apareceria
 * em vermelho antes de o usuário digitar qualquer coisa.
 */
function proximoBloco(blocos: TimeBlock[]): TimeBlock {
  if (blocos.length === 0) return { ...BLOCO_PADRAO };
  const ultimo = blocos[blocos.length - 1];
  const inicioMin = Math.min(toMinutes(ultimo.end), FIM_DO_DIA_MINUTOS);
  const fimMin = Math.min(inicioMin + 60, FIM_DO_DIA_MINUTOS);
  return { start: fromMinutes(inicioMin), end: fromMinutes(fimMin) };
}

/**
 * Valida a grade dia a dia e devolve a mensagem por dia (ou objeto vazio).
 * A tela de detalhe usa isto para travar o botão de salvar antes de o backend
 * recusar — a regra do servidor continua sendo a fonte de verdade.
 */
export function validarGrade(
  hours: BusinessHours,
): Partial<Record<WeekdayKey, string>> {
  const erros: Partial<Record<WeekdayKey, string>> = {};

  for (const dia of WEEKDAY_KEYS) {
    const blocos = hours[dia] ?? [];

    if (
      blocos.some((b) => !TIME_PATTERN.test(b.start) || !TIME_PATTERN.test(b.end))
    ) {
      erros[dia] = "Preencha o horário no formato HH:mm.";
      continue;
    }

    if (blocos.some((b) => toMinutes(b.start) >= toMinutes(b.end))) {
      erros[dia] = "O horário inicial deve ser menor que o final.";
      continue;
    }

    const ordenados = [...blocos].sort(
      (a, b) => toMinutes(a.start) - toMinutes(b.start),
    );
    for (let i = 1; i < ordenados.length; i++) {
      if (toMinutes(ordenados[i].start) < toMinutes(ordenados[i - 1].end)) {
        erros[dia] = "Há blocos de horário sobrepostos neste dia.";
        break;
      }
    }
  }

  return erros;
}

export function BusinessHoursEditor({
  value,
  onChange,
  disabled = false,
}: BusinessHoursEditorProps) {
  const erros = validarGrade(value);

  const trocaDia = (dia: WeekdayKey, blocos: TimeBlock[]) =>
    onChange({ ...value, [dia]: blocos });

  const alternaDia = (dia: WeekdayKey) => {
    const blocos = value[dia] ?? [];
    trocaDia(dia, blocos.length > 0 ? [] : [{ ...BLOCO_PADRAO }]);
  };

  const adicionaBloco = (dia: WeekdayKey) => {
    const blocos = value[dia] ?? [];
    if (blocos.length >= MAX_BLOCKS_PER_DAY) return;
    trocaDia(dia, [...blocos, proximoBloco(blocos)]);
  };

  const removeBloco = (dia: WeekdayKey, indice: number) =>
    trocaDia(
      dia,
      (value[dia] ?? []).filter((_, i) => i !== indice),
    );

  const editaBloco = (
    dia: WeekdayKey,
    indice: number,
    campo: "start" | "end",
    hora: string,
  ) =>
    trocaDia(
      dia,
      (value[dia] ?? []).map((bloco, i) =>
        i === indice ? { ...bloco, [campo]: hora } : bloco,
      ),
    );

  return (
    <div className="flex flex-col gap-2">
      {WEEKDAY_KEYS.map((dia) => {
        const blocos = value[dia] ?? [];
        const aberto = blocos.length > 0;

        return (
          <div
            key={dia}
            data-testid={`dia-${dia}`}
            className="rounded-xl border border-neutral-100 px-3 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={aberto}
                  aria-label={`${aberto ? "Fechar" : "Abrir"} ${WEEKDAY_LABELS[dia]}`}
                  disabled={disabled}
                  onClick={() => alternaDia(dia)}
                  className={`h-5 w-9 rounded-full transition-colors ${
                    aberto ? "bg-teal-600" : "bg-neutral-300"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                      aberto ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold capitalize text-neutral-800">
                  {WEEKDAY_LABELS[dia]}
                </span>
              </div>

              {!aberto && (
                <span className="text-xs text-neutral-400">Fechado</span>
              )}

              {aberto && blocos.length < MAX_BLOCKS_PER_DAY && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => adicionaBloco(dia)}
                  aria-label={`Adicionar bloco em ${WEEKDAY_LABELS[dia]}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar bloco
                </button>
              )}
            </div>

            {aberto && (
              <div className="mt-2 flex flex-col gap-2">
                {blocos.map((bloco, indice) => (
                  <div key={indice} className="flex items-center gap-2">
                    <input
                      type="time"
                      className="ds-input !w-28"
                      value={bloco.start}
                      disabled={disabled}
                      aria-label={`Início do bloco ${indice + 1} em ${WEEKDAY_LABELS[dia]}`}
                      onChange={(e) =>
                        editaBloco(dia, indice, "start", e.target.value)
                      }
                    />
                    <span className="text-neutral-400">–</span>
                    <input
                      type="time"
                      className="ds-input !w-28"
                      value={bloco.end}
                      disabled={disabled}
                      aria-label={`Fim do bloco ${indice + 1} em ${WEEKDAY_LABELS[dia]}`}
                      onChange={(e) =>
                        editaBloco(dia, indice, "end", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => removeBloco(dia, indice)}
                      aria-label={`Remover bloco ${indice + 1} de ${WEEKDAY_LABELS[dia]}`}
                      className="text-neutral-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {erros[dia] && (
              <p className="mt-2 text-xs text-red-500">{erros[dia]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
