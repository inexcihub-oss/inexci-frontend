"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cidService } from "@/services/cid.service";
import { useDebounce } from "@/hooks/useDebounce";
import { useClickOutside } from "@/hooks/useClickOutside";
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
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  useEffect(() => {
    let active = true;
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    cidService
      .search(debounced.trim(), 20)
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
  }, [debounced]);

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
        <div className="relative" ref={containerRef}>
          <div className="flex items-center gap-2 ds-input">
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

          {open && (search.trim().length >= 2 || results.length > 0) && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
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
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
