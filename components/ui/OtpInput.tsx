"use client";

import { useRef, useState, useCallback, useEffect, ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onComplete?: (value: string) => void;
  name?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  name,
  error,
  disabled = false,
  label,
  required,
  autoFocus = false,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    const chars = value.split("").slice(0, length);
    return Array.from({ length }, (_, i) => chars[i] ?? "");
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync external value → internal digits
  useEffect(() => {
    const chars = value.split("").slice(0, length);
    setDigits(Array.from({ length }, (_, i) => chars[i] ?? ""));
  }, [value, length]);

  const emitChange = useCallback(
    (next: string[]) => {
      const joined = next.join("");
      onChange?.({ target: { value: joined, name } } as unknown as React.ChangeEvent<HTMLInputElement>);
      if (joined.length === length) {
        onComplete?.(joined);
      }
    },
    [onChange, onComplete, name, length],
  );

  const handleInput = useCallback(
    (index: number, raw: string) => {
      // Accept only the last digit typed (handles mobile keyboards)
      const digit = raw.replace(/\D/g, "").slice(-1);
      if (!digit) return;

      setDigits((prev) => {
        const next = [...prev];
        next[index] = digit;
        emitChange(next);
        return next;
      });

      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [emitChange, length],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        setDigits((prev) => {
          const next = [...prev];
          if (prev[index]) {
            next[index] = "";
            emitChange(next);
            return next;
          }
          if (index > 0) {
            next[index - 1] = "";
            emitChange(next);
            inputRefs.current[index - 1]?.focus();
          }
          return next;
        });
      } else if (e.key === "ArrowLeft" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === "ArrowRight" && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [emitChange, length],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
      if (!pasted) return;

      setDigits((prev) => {
        const next = [...prev];
        for (let i = 0; i < length; i++) {
          next[i] = pasted[i] ?? "";
        }
        emitChange(next);
        return next;
      });

      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    },
    [emitChange, length],
  );

  return (
    <div className="w-full">
      {label && (
        <label className="ds-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="flex gap-2 sm:gap-3 justify-center">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[i]}
            autoFocus={autoFocus && i === 0}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            disabled={disabled}
            aria-label={`Dígito ${i + 1} de ${length}`}
            className={cn(
              "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-semibold",
              "rounded-xl border bg-white transition-all outline-none",
              "border-gray-200 text-gray-900",
              "focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              digits[i] && "border-teal-400 bg-teal-50/40",
              error && "border-red-500 focus:ring-red-500/20",
            )}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>

      {error && (
        <p className="mt-2 text-xs md:text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default OtpInput;
