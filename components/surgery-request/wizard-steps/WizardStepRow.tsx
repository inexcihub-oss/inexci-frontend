"use client";

import { Check, ChevronRight, X } from "lucide-react";

interface WizardStepRowProps {
  label: string;
  value?: string | null;
  optional?: boolean;
  disabled?: boolean;
  active?: boolean;
  onOpen: () => void;
  onClear?: () => void;
}

export function WizardStepRow({
  label,
  value,
  optional = false,
  disabled = false,
  active = false,
  onOpen,
  onClear,
}: WizardStepRowProps) {
  const stateClass = disabled
    ? "opacity-40 cursor-not-allowed"
    : active
      ? "bg-gray-50"
      : "hover:bg-gray-50 active:bg-gray-100 cursor-pointer";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? "step" : undefined}
      onClick={() => {
        if (!disabled) onOpen();
      }}
      className={`w-full min-h-[60px] px-5 flex items-center justify-between text-left transition-colors border-b border-gray-100 ${stateClass}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-gray-900">
          {label}
          {optional && (
            <>
              {" "}
              <span className="text-gray-400 text-[11px] font-normal">
                (opcional)
              </span>
            </>
          )}
        </span>
        {value && (
          <span className="text-xs text-teal-600 font-medium truncate max-w-[200px]">
            {value}
          </span>
        )}
      </div>
      <span className="flex items-center gap-1.5 ml-3">
        {value ? (
          <>
            {onClear && (
              <span
                role="button"
                aria-label={`Remover ${label.toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="p-0.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden />
              </span>
            )}
            <Check className="w-5 h-5 text-teal-500" aria-hidden />
          </>
        ) : (
          <>
            <span className="text-xs text-gray-400">Selecionar</span>
            <ChevronRight
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              aria-hidden
            />
          </>
        )}
      </span>
    </button>
  );
}
