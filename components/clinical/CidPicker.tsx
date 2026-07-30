"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, Loader2 } from "lucide-react";
import { cidService } from "@/services/cid.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";
import { ClinicalCidCode } from "@/services/clinical-record.service";

interface CidPickerProps {
  value: ClinicalCidCode[];
  onChange: (codes: ClinicalCidCode[]) => void;
  disabled?: boolean;
}

export function CidPicker({ value, onChange, disabled }: CidPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ClinicalCidCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(search, 300);
  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(open, () =>
    setOpen(false),
  );

  useEffect(() => {
    if (!open) return;

    let active = true;
    // Sem termo, busca o começo do catálogo: a lista abre já com opções em vez
    // de um vazio pedindo para digitar.
    const term = debounced.trim().length >= 2 ? debounced.trim() : "";
    setLoading(true);
    cidService
      .search(term, 20)
      .then((res) => {
        if (!active) return;
        setResults(
          res.records.map((r) => ({ code: r.code, description: r.description })),
        );
      })
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, open]);

  const add = (code: ClinicalCidCode) => {
    if (!value.some((c) => c.code === code.code)) {
      onChange([...value, code]);
    }
    setSearch("");
    setResults([]);
    setOpen(false);
  };

  const remove = (code: string) => {
    onChange(value.filter((c) => c.code !== code));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-medium"
            >
              <strong>{c.code}</strong>
              <span className="max-w-[220px] truncate">{c.description}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(c.code)}
                  className="hover:text-teal-900"
                  aria-label={`Remover ${c.code}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <div ref={anchorRef} className="flex items-center gap-2 ds-input">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar CID por código ou descrição..."
              className="flex-1 outline-none bg-transparent text-sm"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Portal: dentro do modal a lista seria cortada pelo corpo rolável. */}
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
                  <div className="py-3 text-center text-sm text-gray-500">
                    {loading ? "Buscando..." : "Nenhum CID encontrado"}
                  </div>
                ) : (
                  results.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => add(r)}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2 min-h-[44px]"
                    >
                      <span className="font-semibold text-teal-700 shrink-0">
                        {r.code}
                      </span>
                      <span className="text-gray-600 truncate">
                        {r.description}
                      </span>
                    </button>
                  ))
                )}
              </div>,
              document.body,
            )}
        </div>
      )}
    </div>
  );
}
