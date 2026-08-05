"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { tussService, TussCode } from "@/services/tuss.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";

export interface TussSelection {
  tussCode: string;
  /** Nome do procedimento no catálogo; ausente em código digitado à mão. */
  name?: string;
}

/**
 * Campo de código TUSS com busca no catálogo — evita decorar/digitar o código
 * inteiro. Ao focar já mostra sugestões, sem exigir que o médico adivinhe o
 * termo. Continua aceitando texto livre: o convênio às vezes pede um código
 * que o catálogo não tem, e travar o campo impediria o pedido.
 */
export function TussCodePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Buscar por código ou procedimento...",
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (selection: TussSelection) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [results, setResults] = useState<TussCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const debounced = useDebounce(value, 300);
  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(open, () =>
    setOpen(false),
  );

  useEffect(() => {
    if (!open) return;

    // Sem termo (ou com termo curto) busca o começo do catálogo: a lista abre
    // já com opções em vez de um vazio pedindo para digitar.
    const term =
      touched && debounced.trim().length >= 2 ? debounced.trim() : undefined;

    let active = true;
    setLoading(true);
    tussService
      .searchTussFromJson(term, 20)
      .then((res) => active && setResults(res))
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [debounced, touched, open]);

  const choose = (item: TussCode) => {
    onChange({ tussCode: item.tussCode, name: item.name });
    setOpen(false);
    setTouched(false);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="ds-label">
        {label}
      </label>
      <div ref={anchorRef} className="flex items-center gap-2 ds-input">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setTouched(true);
            setOpen(true);
            onChange({ tussCode: e.target.value });
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent text-sm min-w-0"
        />
        {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
      </div>

      {/* Portal: dentro do modal o dropdown seria cortado pelo corpo rolável. */}
      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {results.length === 0 ? (
              <div className="py-3 px-3 text-center text-sm text-gray-500">
                {loading ? "Buscando..." : "Nenhum procedimento encontrado"}
              </div>
            ) : (
              results.map((item) => (
                <button
                  key={item.id || item.tussCode}
                  type="button"
                  onClick={() => choose(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm flex flex-col gap-0.5 min-h-[44px]"
                >
                  <span className="font-semibold text-teal-700">
                    {item.tussCode}
                  </span>
                  <span className="text-gray-700 text-xs">{item.name}</span>
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
