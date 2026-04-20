"use client";

/**
 * DateInput — campo de data com máscara DD/MM/AAAA
 *
 * - Exibe para o usuário no formato DD/MM/AAAA (fácil de digitar em mobile)
 * - Chama onChange com o valor no formato YYYY-MM-DD (compatível com o backend)
 * - Aceita value no formato YYYY-MM-DD ou DD/MM/AAAA
 */

import { useRef } from "react";

interface DateInputProps {
  id?: string;
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void; // retorna YYYY-MM-DD
  required?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

/** Converte YYYY-MM-DD → DD/MM/AAAA para exibição */
function toDisplay(value: string): string {
  if (!value) return "";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.substring(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

/** Converte DD/MM/AAAA → YYYY-MM-DD para armazenamento */
function toISO(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 8) {
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    return `${y}-${m}-${d}`;
  }
  return "";
}

/** Aplica a máscara DD/MM/AAAA enquanto o usuário digita */
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateInput({
  id,
  label,
  value,
  onChange,
  required,
  placeholder = "DD/MM/AAAA",
  className,
  error,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = toDisplay(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyMask(e.target.value);

    // Reposiciona o cursor adequadamente
    const pos = masked.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(pos, pos);
      }
    });

    // Emite no formato ISO apenas quando a data estiver completa
    const iso = toISO(masked);
    if (iso) {
      onChange(iso);
    } else if (masked === "") {
      onChange("");
    } else {
      // Valor parcial — emite a string de display para não perder o estado
      onChange(masked);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="ds-label mb-0">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={
          className ??
          `ds-input ${error ? "border-red-400 focus:ring-red-400" : ""}`
        }
      />
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}
