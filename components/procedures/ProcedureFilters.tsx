"use client";

import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  SurgeryRequestStatus,
  PriorityLevel,
} from "@/types/surgery-request.types";

interface FilterOptions {
  status?: SurgeryRequestStatus[];
  priority?: PriorityLevel[];
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface ProcedureFiltersProps {
  onFilterChange?: (filters: FilterOptions) => void;
  onSortChange?: (sortBy: string, order: "asc" | "desc") => void;
}

export const ProcedureFilters: React.FC<ProcedureFiltersProps> = ({
  onFilterChange,
  onSortChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const statusOptions: SurgeryRequestStatus[] = [
    "Pendente",
    "Enviada",
    "Em Análise",
    "Em Reanálise",
    "Autorizada",
    "Agendada",
    "A Faturar",
    "Faturada",
    "Finalizada",
    "Cancelada",
  ];

  const priorityOptions: PriorityLevel[] = ["Baixa", "Média", "Alta"];

  const sortOptions = [
    { value: "createdAt", label: "Data de Criação" },
    { value: "deadline", label: "Prazo" },
    { value: "patient", label: "Paciente" },
    { value: "priority", label: "Prioridade" },
  ];

  const handleStatusToggle = (status: SurgeryRequestStatus) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];

    const newFilters = {
      ...filters,
      status: newStatus.length > 0 ? newStatus : undefined,
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handlePriorityToggle = (priority: PriorityLevel) => {
    const currentPriority = filters.priority || [];
    const newPriority = currentPriority.includes(priority)
      ? currentPriority.filter((p) => p !== priority)
      : [...currentPriority, priority];

    const newFilters = {
      ...filters,
      priority: newPriority.length > 0 ? newPriority : undefined,
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    onFilterChange?.({});
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      const newOrder = sortOrder === "asc" ? "desc" : "asc";
      setSortOrder(newOrder);
      onSortChange?.(newSortBy, newOrder);
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
      onSortChange?.(newSortBy, "desc");
    }
  };

  const activeFiltersCount =
    (filters.status?.length || 0) + (filters.priority?.length || 0);

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-neutral-100 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm">Filtros</span>
        {activeFiltersCount > 0 && (
          <span className="px-2 py-0.5 bg-teal-500 text-white text-xs rounded-full">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-100 rounded-lg shadow-lg z-50">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">Filtros</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Filter */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      filters.status?.includes(status)
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                Prioridade
              </label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((priority) => (
                  <button
                    key={priority}
                    onClick={() => handlePriorityToggle(priority)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      filters.priority?.includes(priority)
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-neutral-900 mb-2">
                Ordenar por
              </label>
              <div className="flex flex-col gap-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm text-left transition-colors flex items-center justify-between ${
                      sortBy === option.value
                        ? "bg-teal-500 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <span className="text-xs">
                        {sortOrder === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-neutral-100">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-2 border border-neutral-100 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
