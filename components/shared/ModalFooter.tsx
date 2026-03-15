"use client";

import React from "react";

interface ModalFooterProps {
  children: React.ReactNode;
  /** Se true, exibe os botões alinhados à direita (padrão: justify-between) */
  align?: "between" | "end";
  className?: string;
}

/**
 * Rodapé fixo reutilizável para modais multi-etapa.
 * Mantém posição sticky ao final do modal e exibe botões de navegação.
 */
export function ModalFooter({
  children,
  align = "between",
  className = "",
}: ModalFooterProps) {
  const justifyClass = align === "end" ? "justify-end" : "justify-between";

  return (
    <div
      className={`flex items-center ${justifyClass} gap-3 px-4 sm:px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white ${className}`}
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      {children}
    </div>
  );
}

interface SpinnerButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger" | "warning";
  className?: string;
  children: React.ReactNode;
  type?: "button" | "submit";
}

/**
 * Botão com estado de loading reutilizável.
 * Substitui o padrão de ternário com spinner nos modais.
 */
export function SpinnerButton({
  onClick,
  disabled,
  isLoading = false,
  loadingText,
  variant = "primary",
  className = "",
  children,
  type = "button",
}: SpinnerButtonProps) {
  const variantClasses: Record<string, string> = {
    primary:
      "text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed",
    secondary:
      "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50",
    danger: "text-white bg-red-600 hover:bg-red-700 disabled:opacity-50",
    warning:
      "text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 min-h-[44px] active:scale-[0.98] ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText ?? "Aguarde..."}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
