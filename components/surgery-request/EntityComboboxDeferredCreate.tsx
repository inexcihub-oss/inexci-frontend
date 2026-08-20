"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Plus, Search } from "lucide-react";

export interface ComboboxOption {
  id: string;
  name: string;
}

export interface EntityComboboxDeferredCreateProps {
  /** id do registro existente selecionado ("" quando é um nome novo) */
  value: string;
  /** texto digitado — vira o nome do registro criado no submit */
  query: string;
  options: ComboboxOption[];
  placeholder: string;
  emptyText: string;
  /** rótulo da entidade, usado nas mensagens ("hospital", "convênio"...) */
  createLabel: string;
  onSelect: (id: string) => void;
  onQueryChange: (name: string) => void;
  error?: string;
}

/**
 * Combobox com criação adiada: o usuário escolhe um registro existente ou
 * digita um nome novo, que só é criado quando a solicitação é salva.
 *
 * O nome digitado precisa ser confirmável de três formas — clicando na linha
 * "será criado como ...", apertando Enter ou simplesmente deixando o texto no
 * campo. Enter é interceptado (`preventDefault`) porque o combobox vive dentro
 * de um `<form>`: sem isso a tecla submetia a solicitação inteira em vez de
 * aceitar o nome digitado.
 */
export function EntityComboboxDeferredCreate({
  value,
  query,
  options,
  placeholder,
  emptyText,
  createLabel,
  onSelect,
  onQueryChange,
  error,
}: EntityComboboxDeferredCreateProps) {
  const selected = options.find((o) => o.id === value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactOption = options.find(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase(),
  );
  const hasExactMatch = !!exactOption;
  const isNew = !value && !!query.trim() && !hasExactMatch;

  const handleSelect = (o: ComboboxOption) => {
    onSelect(o.id);
    onQueryChange(o.name);
    setHighlight(-1);
    setIsOpen(false);
  };

  /** Aceita o texto digitado como registro novo (criado só no submit). */
  const commitNewName = () => {
    const name = query.trim();
    if (!name) return;
    onSelect("");
    onQueryChange(name);
    setHighlight(-1);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      if (filtered.length === 0) return;
      setHighlight((prev) => {
        const next = e.key === "ArrowDown" ? prev + 1 : prev - 1;
        if (next < 0) return filtered.length - 1;
        if (next > filtered.length - 1) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      // Confirma o combobox — nunca submete o formulário que o envolve.
      e.preventDefault();
      const highlighted = highlight >= 0 ? filtered[highlight] : undefined;
      if (highlighted) handleSelect(highlighted);
      else if (exactOption) handleSelect(exactOption);
      else commitNewName();
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={selected?.name ?? query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (value) onSelect("");
            setHighlight(-1);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`ds-input pl-9 pr-9 ${error ? "border-red-500" : ""}`}
        />
        {selected && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
        )}
        {isNew && (
          <Plus className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filtered.map((o, index) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => handleSelect(o)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-teal-50 transition-colors flex items-center justify-between ${
                value === o.id
                  ? "bg-teal-50 text-teal-700 font-medium"
                  : index === highlight
                    ? "bg-teal-50 text-gray-700"
                    : "text-gray-700"
              }`}
            >
              <span className="truncate">{o.name}</span>
              {value === o.id && (
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
              )}
            </button>
          ))}

          {filtered.length === 0 && !hasExactMatch && (
            <div className="px-3 py-2 text-sm text-gray-400">{emptyText}</div>
          )}

          {query.trim() && !hasExactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={commitNewName}
              className="w-full text-left px-3 py-2.5 text-sm text-teal-700 border-t border-neutral-100 font-medium flex items-center gap-2 hover:bg-teal-50 transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Usar &ldquo;{query.trim()}&rdquo; — será criado como{" "}
                {createLabel} ao salvar
              </span>
            </button>
          )}
        </div>
      )}

      {isNew && !isOpen && (
        <p className="mt-1 text-sm text-teal-700">
          Novo {createLabel}: &ldquo;{query.trim()}&rdquo; será criado ao salvar.
        </p>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default EntityComboboxDeferredCreate;
