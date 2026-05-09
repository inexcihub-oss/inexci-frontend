"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { passwordStrength } from "@/lib/validators";
import { PasswordRequirements } from "./PasswordRequirements";

// ─── Ícones inline (evita dependência de lib de ícones) ──────────────────────

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  );
}

// ─── Cálculo de força de senha ───────────────────────────────────────────────

/**
 * Mantém compatibilidade com chamadores antigos. Internamente usa
 * `passwordStrength` (0-5) e mapeia para a escala antiga (0-4).
 */
export function getPasswordStrength(password: string): number {
  const score = passwordStrength(password);
  // Mapeia 0-5 para 0-4 (5 requisitos atendidos => "Forte")
  return Math.min(4, score === 5 ? 4 : Math.max(0, score - 1));
}

const STRENGTH_LABELS = ["", "Fraca", "Razoável", "Boa", "Forte"];
const STRENGTH_COLORS = [
  "",
  "bg-red-500",
  "bg-yellow-400",
  "bg-blue-500",
  "bg-teal-500",
];

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PasswordInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: string;
  /** Exibe barra de força da senha quando true */
  showStrength?: boolean;
  /** Exibe checklist visual dos requisitos (8 chars, maiúscula, etc.) */
  showRequirements?: boolean;
}

// ─── Componente ──────────────────────────────────────────────────────────────

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      label,
      error,
      showStrength = false,
      showRequirements = false,
      ...props
    },
    ref,
  ) => {
    const [visible, setVisible] = useState(false);

    const value = typeof props.value === "string" ? props.value : "";
    const strength = showStrength ? getPasswordStrength(value) : 0;

    return (
      <div className="w-full">
        {label && (
          <label className="ds-label">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            type={visible ? "text" : "password"}
            className={cn(
              "ds-input pr-11",
              error && "border-red-500 focus:ring-red-500",
              className,
            )}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          >
            {visible ? (
              <EyeOffIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Barra de força */}
        {showStrength && value.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    strength >= level
                      ? STRENGTH_COLORS[strength]
                      : "bg-gray-200",
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Força da senha:{" "}
              <span className="font-medium">{STRENGTH_LABELS[strength]}</span>
            </p>
          </div>
        )}

        {/* Checklist de requisitos */}
        {showRequirements && <PasswordRequirements password={value} />}

        {error && (
          <p className="mt-1 text-xs md:text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
