"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";

export interface CatalogOption {
  id: string;
  name: string;
}

interface CatalogAutocompleteProps<T extends CatalogOption> {
  value: string;
  placeholder: string;
  options: T[];
  isRegistered?: boolean;
  registeredTitle: string;
  newItemNoun: string;
  onInputChange?: (text: string) => void;
  onSelect: (option: T) => void;
  onCommit: (text: string) => void;
}

export function CatalogAutocomplete<T extends CatalogOption>({
  value,
  placeholder,
  options,
  isRegistered,
  registeredTitle,
  newItemNoun,
  onInputChange,
  onSelect,
  onCommit,
}: CatalogAutocompleteProps<T>) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const queryRef = useRef(query);
  queryRef.current = query;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const { anchorRef, dropdownRef, position } = useAnchoredDropdown(
    isOpen,
    () => {
      setIsOpen(false);
      const typed = queryRef.current.trim();
      if (typed !== valueRef.current) onCommit(typed);
    },
  );

  const normalized = query.trim().toLowerCase();
  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = options.some((o) => o.name.toLowerCase() === normalized);
  const registered = isRegistered ?? exactMatch;

  const handleSelect = (option: T) => {
    onSelect(option);
    setQuery(option.name);
    setIsOpen(false);
  };

  const handleAddNew = () => {
    const name = query.trim();
    if (!name) return;
    onCommit(name);
    setIsOpen(false);
  };

  const showDropdown =
    isOpen && (filtered.length > 0 || (query.trim() && !exactMatch));

  return (
    <div ref={anchorRef} className="flex-1 min-w-0 relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onInputChange?.(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-expanded={Boolean(showDropdown)}
          aria-controls={listboxId}
          aria-autocomplete="list"
          role="combobox"
          className={`ds-input pr-8 ${
            registered ? "border-primary-300 bg-primary-50/30" : ""
          }`}
        />
        {registered && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"
            title={registeredTitle}
            aria-hidden="true"
          />
        )}
      </div>

      {showDropdown &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              zIndex: 9999,
            }}
            className="mt-1 bg-white border border-neutral-100 rounded-xl shadow-lg max-h-56 overflow-y-auto"
          >
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={o.name === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(o);
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-primary-50 transition-colors flex items-center gap-2"
              >
                <span className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                <span className="truncate">{o.name}</span>
              </button>
            ))}
            {query.trim() && !exactMatch && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAddNew();
                }}
                className="w-full text-left px-3 py-2.5 text-sm text-primary-700 font-semibold hover:bg-primary-50 transition-colors border-t border-neutral-100 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                <span className="truncate">
                  Adicionar &ldquo;{query.trim()}&rdquo; {newItemNoun}
                </span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
