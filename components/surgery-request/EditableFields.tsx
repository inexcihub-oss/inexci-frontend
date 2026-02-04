"use client";

import React, { useState, useEffect, useRef } from "react";
import { surgeryRequestService } from "@/services/surgery-request.service";
import { userService } from "@/services/user.service";

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

// Estilos por status
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
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    label: "Em Reanálise",
  },
  5: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    label: "Aguardando Agendamento",
  },
  6: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    label: "Agendada",
  },
  7: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    border: "border-cyan-200",
    label: "A Faturar",
  },
  8: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    label: "Faturada",
  },
  9: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    label: "Concluída",
  },
  10: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    label: "Cancelada",
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

// Cores por prioridade
const priorityStyles: Record<
  string,
  { bg: string; text: string; border: string; hoverBg: string }
> = {
  Alta: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    hoverBg: "hover:bg-red-100",
  },
  Média: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    hoverBg: "hover:bg-amber-100",
  },
  Baixa: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    hoverBg: "hover:bg-emerald-100",
  },
};

interface EditablePriorityProps {
  initialValue: string;
  surgeryRequestId: string;
  onUpdate?: () => void;
}

export function EditablePriority({
  initialValue,
  surgeryRequestId,
  onUpdate,
}: EditablePriorityProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue || "Média");
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const priorities = ["Alta", "Média", "Baixa"];
  const currentStyle = priorityStyles[value] || priorityStyles.Média;

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

  const handleSave = async (newValue: string) => {
    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await surgeryRequestService.updateBasicData(surgeryRequestId, {
        priority: newValue,
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
          inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium rounded-md
          border transition-all duration-150
          ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} ${currentStyle.hoverBg}
          ${isEditing ? "ring-2 ring-offset-1 ring-teal-500" : ""}
        `}
        disabled={isLoading}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${value === "Alta" ? "bg-red-500" : value === "Baixa" ? "bg-emerald-500" : "bg-amber-500"}`}
        />
        {isLoading ? "..." : value}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform ${isEditing ? "rotate-180" : ""}`}
        />
      </button>

      {isEditing && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[100px] animate-in fade-in slide-in-from-top-1 duration-150">
          {priorities.map((priority) => {
            const style = priorityStyles[priority];
            const isSelected = priority === value;
            return (
              <button
                key={priority}
                onClick={() => handleSave(priority)}
                className={`
                  w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors
                  ${isSelected ? "bg-gray-50 font-medium" : "hover:bg-gray-50"}
                `}
              >
                <span
                  className={`w-2 h-2 rounded-full ${priority === "Alta" ? "bg-red-500" : priority === "Baixa" ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <span className={style.text}>{priority}</span>
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 ml-auto text-teal-600"
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

interface EditableManagerProps {
  initialValue: { id: number; name: string } | null;
  surgeryRequestId: string;
  onUpdate?: () => void;
}

export function EditableManager({
  initialValue,
  surgeryRequestId,
  onUpdate,
}: EditableManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [managers, setManagers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const loadManagers = async () => {
      setIsLoadingManagers(true);
      try {
        const managersData = await userService.getAll();
        setManagers(managersData);
      } catch (error) {
        console.error("Erro ao carregar gestores:", error);
      } finally {
        setIsLoadingManagers(false);
      }
    };

    if (isEditing && managers.length === 0) {
      loadManagers();
    }
  }, [isEditing, managers.length]);

  const handleSave = async (newManagerId: number) => {
    if (newManagerId === value?.id) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await surgeryRequestService.updateBasicData(surgeryRequestId, {
        responsible_id: newManagerId,
      });

      const newManager = managers.find((m) => m.id === newManagerId);
      setValue(
        newManager ? { id: newManager.id, name: newManager.name } : null,
      );
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar gestor:", error);
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsEditing(!isEditing)}
        className={`
          inline-flex items-center gap-2 h-7 px-3 text-xs rounded-md
          border border-gray-200 bg-white transition-all duration-150
          hover:bg-gray-50 hover:border-gray-300
          ${isEditing ? "ring-2 ring-offset-1 ring-teal-500 border-teal-500" : ""}
        `}
        disabled={isLoading}
      >
        {value?.name ? (
          <>
            <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
              {getInitials(value.name)}
            </span>
            <span className="text-gray-700">{value.name}</span>
          </>
        ) : (
          <span className="text-gray-400">Selecionar gestor</span>
        )}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isEditing ? "rotate-180" : ""}`}
        />
      </button>

      {isEditing && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] max-h-[200px] overflow-auto animate-in fade-in slide-in-from-top-1 duration-150">
          {isLoadingManagers ? (
            <div className="px-3 py-2 text-xs text-gray-500 text-center">
              Carregando...
            </div>
          ) : (
            managers.map((manager) => {
              const isSelected = manager.id === value?.id;
              return (
                <button
                  key={manager.id}
                  onClick={() => handleSave(manager.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors
                    ${isSelected ? "bg-teal-50 text-teal-700" : "hover:bg-gray-50 text-gray-700"}
                  `}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${isSelected ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {getInitials(manager.name)}
                  </span>
                  <span className="flex-1">{manager.name}</span>
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
            })
          )}
        </div>
      )}
    </div>
  );
}

interface EditableDeadlineProps {
  initialValue: string | null;
  surgeryRequestId: string;
  onUpdate?: () => void;
}

export function EditableDeadline({
  initialValue,
  surgeryRequestId,
  onUpdate,
}: EditableDeadlineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.showPicker?.();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return "Definir prazo";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const isOverdue = (dateString: string | null): boolean => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  const isNearDeadline = (dateString: string | null): boolean => {
    if (!dateString) return false;
    const deadline = new Date(dateString);
    const now = new Date();
    const diffDays =
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 3;
  };

  const handleSave = async (newValue: string) => {
    const dateValue = newValue || null;

    if (dateValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await surgeryRequestService.updateBasicData(surgeryRequestId, {
        deadline: dateValue,
      });
      setValue(dateValue);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar prazo:", error);
    } finally {
      setIsLoading(false);
      setIsEditing(false);
    }
  };

  const getDeadlineStyle = () => {
    if (!value) {
      return "border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:border-gray-300";
    }
    if (isOverdue(value)) {
      return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
    }
    if (isNearDeadline(value)) {
      return "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100";
    }
    return "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300";
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="date"
          defaultValue={formatDateForInput(value)}
          onChange={(e) => handleSave(e.target.value)}
          className="h-7 text-gray-700 text-xs bg-white border border-teal-500 rounded-md px-3 ring-2 ring-offset-1 ring-teal-500 outline-none"
          disabled={isLoading}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`
        inline-flex items-center gap-1.5 h-7 px-3 text-xs rounded-md
        border transition-all duration-150
        ${getDeadlineStyle()}
        ${isEditing ? "ring-2 ring-offset-1 ring-teal-500" : ""}
      `}
      disabled={isLoading}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
      {isLoading ? "..." : formatDateForDisplay(value)}
      <ChevronDownIcon className="w-3.5 h-3.5 opacity-60" />
    </button>
  );
}
