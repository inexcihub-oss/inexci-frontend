"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import ReactDOM from "react-dom";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";
import { useAnchoredDropdown } from "@/hooks/useAnchoredDropdown";

interface SelectSearchOption {
  value: string;
  label: string;
}

interface SelectSearchProps {
  value: string;
  onChange: (value: string, label?: string) => void;
  onSearch: (search: string) => Promise<SelectSearchOption[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
  clearable?: boolean;
  initialLabel?: string;
  ariaLabel?: string;
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debouncedFn = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  }) as T & { cancel: () => void };

  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn;
}

export function SelectSearch({
  value,
  onChange,
  onSearch,
  placeholder = "Buscar...",
  disabled = false,
  className = "",
  label,
  error,
  clearable = true,
  initialLabel,
  ariaLabel,
}: SelectSearchProps) {
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<SelectSearchOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    anchorRef,
    dropdownRef,
    position: dropdownPosition,
  } = useAnchoredDropdown(isOpen, () => setIsOpen(false));

  const onSearchRef = useRef(onSearch);
  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const debouncedSearchRef = useRef(
    debounce(async (term: string) => {
      setIsLoading(true);
      try {
        const results = await onSearchRef.current(term);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
  );

  useEffect(() => {
    if (!isOpen) return;
    const fn = debouncedSearchRef.current;
    fn(searchTerm);
    return () => fn.cancel();
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find((opt) => opt.value === value);
      if (found) {
        setSelectedLabel(found.label);
      }
    } else if (!value) {
      setSelectedLabel("");
    }
  }, [value, options]);

  useEffect(() => {
    if (value && initialLabel && !selectedLabel) {
      setSelectedLabel(initialLabel);
    }
  }, [value, initialLabel, selectedLabel]);

  const handleSelect = (option: SelectSearchOption) => {
    onChange(option.value, option.label);
    setSelectedLabel(option.label);
    setSearchTerm("");
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setSelectedLabel("");
    setSearchTerm("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 break-words">
          {label}
        </label>
      )}
      <div
        ref={anchorRef}
        className={`
          relative flex items-center w-full border rounded-xl bg-white cursor-pointer
          ${error ? "border-red-500" : "border-gray-300"}
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "hover:border-gray-400"}
          ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
        `}
        onClick={handleToggle}
        role="combobox"
        aria-label={ariaLabel ?? label}
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-disabled={disabled || undefined}
        tabIndex={disabled || isOpen ? -1 : 0}
        onKeyDown={(e) => {
          if (isOpen || (e.key !== "Enter" && e.key !== " ")) return;
          e.preventDefault();
          handleToggle();
        }}
      >
        <div className="flex-1 flex items-center min-h-[36px] md:min-h-10 px-3 md:px-3.5 min-w-0 overflow-hidden">
          {isOpen ? (
            <div className="flex items-center w-full">
              <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                placeholder={placeholder}
                aria-label={ariaLabel ?? label}
                className="flex-1 outline-none text-base md:text-sm bg-transparent"
                onClick={(e) => e.stopPropagation()}
                disabled={disabled}
              />
            </div>
          ) : (
            <span
              className={`text-xs md:text-sm truncate ${
                selectedLabel ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {selectedLabel || placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center pr-2 gap-1">
          {isLoading && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {isOpen &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? label}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 9999,
            }}
            className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
          >
            {isLoading && options.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <span className="ml-2 text-sm text-gray-500">
                  Carregando...
                </span>
              </div>
            ) : options.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                {searchTerm.length < 2
                  ? "Digite pelo menos 2 caracteres para buscar"
                  : "Nenhum resultado encontrado"}
              </div>
            ) : (
              options.map((option) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  className={`
                    px-3.5 py-3 md:py-2 cursor-pointer text-sm min-h-[44px] md:min-h-0 flex items-center active:bg-gray-100
                    ${option.value === value ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}
                  `}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>,
          document.body,
        )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default SelectSearch;
