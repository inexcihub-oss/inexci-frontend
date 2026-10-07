"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import { AvailableDoctor } from "@/types";
import { cn } from "@/lib/utils";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";

interface AgendaDoctorFilterProps {
  doctors: AvailableDoctor[];
  selectedDoctorIds: string[];
  onChange: (doctorIds: string[]) => void;
  /** Contagem por profissional no período visível (opcional). */
  countByDoctorId?: Record<string, number>;
}

/** A busca só aparece quando a lista deixa de caber de relance. */
const BUSCA_A_PARTIR_DE = 7;
const LARGURA_LISTA = 300;

const semAcento = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Filtro de profissionais: um botão compacto ("Todos os profissionais", o
 * nome escolhido ou "3 profissionais") que abre uma lista com busca. Escala
 * para dezenas de profissionais sem tomar a tela — antes eram pílulas, uma
 * por nome, que quebravam em várias linhas no celular.
 *
 * Seleção múltipla, aplicada na hora. Nenhum marcado = todos.
 */
export function AgendaDoctorFilter({
  doctors,
  selectedDoctorIds,
  onChange,
  countByDoctorId,
}: AgendaDoctorFilterProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const buscaRef = useRef<HTMLInputElement>(null);
  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(
    aberto,
    () => setAberto(false),
  );

  useEffect(() => {
    if (!aberto) {
      setBusca("");
      return;
    }
    buscaRef.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  // Quem tem mais consultas no período primeiro; empate por nome.
  const ordenados = useMemo(
    () =>
      [...doctors].sort(
        (a, b) =>
          (countByDoctorId?.[b.id] ?? 0) - (countByDoctorId?.[a.id] ?? 0) ||
          a.name.localeCompare(b.name, "pt-BR"),
      ),
    [doctors, countByDoctorId],
  );
  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim());
    return termo
      ? ordenados.filter((d) => semAcento(d.name).includes(termo))
      : ordenados;
  }, [ordenados, busca]);

  if (doctors.length <= 1) return null;

  const todos = selectedDoctorIds.length === 0;
  const rotulo = todos
    ? "Todos os profissionais"
    : selectedDoctorIds.length === 1
      ? (doctors.find((d) => d.id === selectedDoctorIds[0])?.name ??
        "1 profissional")
      : `${selectedDoctorIds.length} profissionais`;

  const alternar = (id: string) =>
    onChange(
      selectedDoctorIds.includes(id)
        ? selectedDoctorIds.filter((x) => x !== id)
        : [...selectedDoctorIds, id],
    );

  // A lista é mais larga que o botão; no celular, não pode sair da tela.
  const largura =
    typeof window === "undefined"
      ? LARGURA_LISTA
      : Math.min(LARGURA_LISTA, window.innerWidth - 16);
  const esquerda =
    typeof window === "undefined"
      ? position.left
      : Math.max(8, Math.min(position.left, window.innerWidth - largura - 8));

  return (
    <div ref={anchorRef} className="inline-block max-w-full">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={`Profissionais: ${rotulo}`}
        // Mesma medida do "Ver agenda" ao lado (h-8, px-3, ícone 3.5).
        className={cn(
          "flex h-8 max-w-full shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
          todos
            ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            : "border-teal-600 bg-teal-50 text-teal-800 hover:bg-teal-100",
        )}
      >
        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{todos ? "Profissionais" : rotulo}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform",
            aberto && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {aberto &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            role="dialog"
            aria-label="Filtrar por profissional"
            className="fixed z-[70] mt-1 flex max-h-[min(420px,70vh)] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
            style={{ top: position.top, left: esquerda, width: largura }}
          >
            {doctors.length >= BUSCA_A_PARTIR_DE && (
              <div className="border-b border-neutral-100 p-2">
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5">
                  <Search
                    className="h-4 w-4 shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    ref={buscaRef}
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar profissional"
                    aria-label="Buscar profissional"
                    className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>
            )}

            <ul className="flex-1 overflow-y-auto py-1">
              {!busca && (
                <li>
                  <Opcao
                    rotulo="Todos os profissionais"
                    marcado={todos}
                    onClick={() => onChange([])}
                  />
                </li>
              )}
              {visiveis.map((d) => (
                <li key={d.id}>
                  <Opcao
                    rotulo={d.name}
                    marcado={selectedDoctorIds.includes(d.id)}
                    contagem={countByDoctorId?.[d.id]}
                    onClick={() => alternar(d.id)}
                  />
                </li>
              ))}
              {visiveis.length === 0 && (
                <li className="px-3 py-4 text-center text-sm text-neutral-400">
                  Nenhum profissional encontrado.
                </li>
              )}
            </ul>

            {!todos && (
              <div className="flex items-center justify-between border-t border-neutral-100 px-3 py-2">
                <span className="text-xs text-neutral-500">
                  {selectedDoctorIds.length} selecionado
                  {selectedDoctorIds.length > 1 ? "s" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="min-h-[36px] px-2 text-xs font-semibold text-teal-700 hover:underline"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

function Opcao({
  rotulo,
  marcado,
  contagem,
  onClick,
}: {
  rotulo: string;
  marcado: boolean;
  contagem?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={marcado}
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left text-sm text-neutral-800 hover:bg-neutral-50"
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          marcado
            ? "border-teal-600 bg-teal-600 text-white"
            : "border-neutral-300 bg-white",
        )}
      >
        {marcado && <Check className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{rotulo}</span>
      {typeof contagem === "number" && (
        <span className="shrink-0 text-xs tabular-nums text-neutral-400">
          {contagem}
        </span>
      )}
    </button>
  );
}
