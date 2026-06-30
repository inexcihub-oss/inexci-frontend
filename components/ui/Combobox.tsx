"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  /** Quando informado, exibe uma opção para criar um novo item a partir do texto buscado. */
  onCreateNew?: (query: string) => void;
  /** Nome do tipo de item usado no texto da opção "criar novo" (ex.: "convênio"). */
  createNewLabel?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Pesquisar...",
  emptyText = "Nenhum resultado encontrado.",
  disabled = false,
  className,
  label,
  onCreateNew,
  createNewLabel = "item",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dropdownPosition, setDropdownPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  const selectedOption = options.find((option) => option.value === value);

  const hasExactMatch = options.some(
    (option) =>
      option.label.toLowerCase() === searchQuery.trim().toLowerCase(),
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  React.useEffect(() => {
    if (open && buttonRef.current) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom,
            left: rect.left,
            width: rect.width,
          });
        }
      };

      updatePosition();

      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
  };

  const handleCreateNew = () => {
    onCreateNew?.(searchQuery.trim());
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {label && <label className="ds-label">{label}</label>}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className={cn(
            "flex h-9 md:h-10 w-full items-center justify-between rounded-xl border border-neutral-100 bg-white px-3 md:px-3.5 py-1.5 md:py-2 text-xs md:text-sm",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-200",
            "disabled:cursor-not-allowed disabled:opacity-50",
            !selectedOption && "text-gray-500",
            className,
          )}
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleClear(e as any);
                  }
                }}
                className="hover:bg-neutral-100 rounded-lg p-1.5 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-500" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </button>

        {open &&
          typeof window !== "undefined" &&
          createPortal(
            <div
              ref={dropdownRef}
              style={{
                position: "fixed",
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999,
              }}
              className="mt-1 rounded-xl border border-neutral-100 bg-white shadow-lg"
            >
              <div className="p-2">
                <input
                  type="text"
                  className="ds-input h-10 md:h-9"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-auto p-1">
                {filteredOptions.length === 0 && !onCreateNew && (
                  <div className="py-6 text-center text-xs md:text-sm text-gray-500">
                    {emptyText}
                  </div>
                )}
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-xs md:text-sm outline-none min-h-[36px] md:min-h-[44px] active:bg-neutral-100",
                      "hover:bg-neutral-50",
                      value === option.value
                        ? "bg-neutral-100 text-black"
                        : "text-gray-900",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
                {onCreateNew && !hasExactMatch && (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className={cn(
                      "flex w-full cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2.5 text-xs md:text-sm font-semibold text-primary-700 outline-none min-h-[36px] md:min-h-[44px] hover:bg-primary-50 active:bg-primary-100",
                      filteredOptions.length > 0 &&
                        "mt-1 border-t border-neutral-100 pt-2.5",
                    )}
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {searchQuery.trim()
                        ? `Adicionar "${searchQuery.trim()}" como novo ${createNewLabel}`
                        : `Cadastrar novo ${createNewLabel}`}
                    </span>
                  </button>
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
