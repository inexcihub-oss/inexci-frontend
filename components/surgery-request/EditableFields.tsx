"use client";

import React, { useState, useEffect, useRef } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import {
  PriorityLevel,
  PRIORITY_LABELS,
  PRIORITY,
} from "@/types/surgery-request.types";

// Ícone de chevron para dropdown
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

// Estilos por status (9 status corretos conforme backend)
const statusStyles: Record<
  number,
  { bg: string; text: string; border: string; label: string }
> = {
  1: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    label: "Pendente",
  },
  2: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    label: "Enviada",
  },
  3: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    label: "Em Análise",
  },
  4: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    label: "Em Agendamento",
  },
  5: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    label: "Agendada",
  },
  6: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "Realizada",
  },
  7: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    label: "Faturada",
  },
  8: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    label: "Finalizada",
  },
  9: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Encerrada",
  },
};

interface StatusBadgeProps {
  status: number;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || {
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
    label: "Desconhecido",
  };

  return (
    <span
      className={`
        inline-flex items-center h-7 px-3 text-xs font-medium rounded-md
        border ${style.bg} ${style.text} ${style.border}
      `}
    >
      {style.label}
    </span>
  );
}

// Cores por prioridade - mesmas do Kanban (design-system.ts)
const priorityStyles: Record<
  PriorityLevel,
  {
    bg: string;
    text: string;
    border: string;
    hoverBg: string;
  }
> = {
  1: {
    // Baixa - Verde
    bg: "bg-chip-baixa-bg",
    text: "text-chip-baixa-text",
    border: "border-chip-baixa-bg",
    hoverBg: "hover:bg-chip-baixa-hover",
  },
  2: {
    // Média - Azul
    bg: "bg-chip-media-bg",
    text: "text-chip-media-text",
    border: "border-chip-media-bg",
    hoverBg: "hover:bg-chip-media-hover",
  },
  3: {
    // Alta - Amarelo
    bg: "bg-chip-alta-bg",
    text: "text-chip-alta-text",
    border: "border-chip-alta-bg",
    hoverBg: "hover:bg-chip-alta-hover",
  },
  4: {
    // Urgente - Vermelho
    bg: "bg-chip-urgente-bg",
    text: "text-chip-urgente-text",
    border: "border-chip-urgente-bg",
    hoverBg: "hover:bg-chip-urgente-hover",
  },
};

interface EditablePriorityProps {
  initialValue: PriorityLevel;
  surgeryRequestId: string | number;
  onUpdate?: () => void;
}

export function EditablePriority({
  initialValue,
  surgeryRequestId,
  onUpdate,
}: EditablePriorityProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<PriorityLevel>(
    initialValue || PRIORITY.MEDIUM,
  );
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const priorities: PriorityLevel[] = [
    PRIORITY.LOW,
    PRIORITY.MEDIUM,
    PRIORITY.HIGH,
    PRIORITY.URGENT,
  ];
  const currentStyle = priorityStyles[value] || priorityStyles[PRIORITY.MEDIUM];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  const handleSave = async (newValue: PriorityLevel) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await surgeryRequestService.updateBasicData(surgeryRequestId, {
        priority: Number(newValue),
      });
      setValue(newValue);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar prioridade:", error);
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsEditing(!isEditing)}
        className={`
          inline-flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded
          transition-all duration-150
          ${currentStyle.bg} ${currentStyle.text} ${currentStyle.hoverBg}
          ${isEditing ? "ring-2 ring-offset-1 ring-teal-500" : ""}
        `}
        disabled={isLoading}
      >
        {isLoading ? "..." : PRIORITY_LABELS[value]}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform ${isEditing ? "rotate-180" : ""}`}
        />
      </button>

      {isEditing && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[120px] animate-in fade-in slide-in-from-top-1 duration-150">
          {priorities.map((priority) => {
            const style = priorityStyles[priority];
            const isSelected = priority === value;
            return (
              <button
                key={priority}
                onClick={() => handleSave(priority)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors
                  ${isSelected ? "bg-gray-50 font-semibold" : "hover:bg-gray-50 font-medium"}
                `}
              >
                <span className={`flex-1 ${style.text}`}>
                  {PRIORITY_LABELS[priority]}
                </span>
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 text-teal-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
