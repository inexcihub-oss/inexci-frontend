"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";

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
}

// Custom debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
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
}: SelectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState<SelectSearchOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      setIsLoading(true);
      try {
        const results = await onSearch(term);
        setOptions(results);
      } catch (error) {
        console.error("Erro na busca:", error);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [onSearch]
  );

  // Effect to search when term changes
  useEffect(() => {
    if (isOpen) {
      debouncedSearch(searchTerm);
    }
    return () => debouncedSearch.cancel();
  }, [searchTerm, isOpen, debouncedSearch]);

  // Effect to load initial options when opening
  useEffect(() => {
    if (isOpen && options.length === 0 && !searchTerm) {
      debouncedSearch("");
    }
  }, [isOpen, options.length, searchTerm, debouncedSearch]);

  // Effect to set selected label when value changes
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        className={`
          relative flex items-center w-full border rounded-lg bg-white cursor-pointer
          ${error ? "border-red-500" : "border-gray-300"}
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "hover:border-gray-400"}
          ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
        `}
        onClick={handleToggle}
      >
        <div className="flex-1 flex items-center min-h-10 px-3">
          {isOpen ? (
            <div className="flex items-center w-full">
              <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleInputChange}
                placeholder={placeholder}
                className="flex-1 outline-none text-sm bg-transparent"
                onClick={(e) => e.stopPropagation()}
                disabled={disabled}
              />
            </div>
          ) : (
            <span
              className={`text-sm truncate ${
                selectedLabel ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {selectedLabel || placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center pr-2 gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading && options.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Carregando...</span>
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
                className={`
                  px-3 py-2 cursor-pointer text-sm
                  ${option.value === value ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50"}
                `}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default SelectSearch;
