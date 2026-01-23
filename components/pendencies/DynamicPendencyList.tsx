"use client";

import { cn } from "@/lib/utils";
import { CalculatedPendency } from "@/services/pendency.service";
import { Check, Clock, AlertCircle, Circle } from "lucide-react";

interface DynamicPendencyListProps {
  pendencies: CalculatedPendency[];
  statusLabel: string;
  canAdvance: boolean;
  completedCount: number;
  pendingCount: number;
  totalCount: number;
  compact?: boolean;
  className?: string;
}

export function DynamicPendencyList({
  pendencies,
  statusLabel,
  canAdvance,
  completedCount,
  pendingCount,
  totalCount,
  compact = false,
  className,
}: DynamicPendencyListProps) {
  if (pendencies.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
        <p>Nenhuma pendência para este status</p>
      </div>
    );
  }

  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header com resumo */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Status: {statusLabel}
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              canAdvance
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {canAdvance ? "Pode avançar" : `${pendingCount} pendente(s)`}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              "h-2 rounded-full transition-all",
              canAdvance ? "bg-green-500" : "bg-teal-600",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-xs text-gray-500 text-center">
          {completedCount} de {totalCount} concluídas
        </div>
      </div>

      {/* Lista de pendências */}
      <div className={cn(compact ? "space-y-1" : "space-y-2")}>
        {pendencies.map((pendency, index) => (
          <DynamicPendencyItem
            key={pendency.key}
            pendency={pendency}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface DynamicPendencyItemProps {
  pendency: CalculatedPendency;
  compact?: boolean;
}

function DynamicPendencyItem({
  pendency,
  compact = false,
}: DynamicPendencyItemProps) {
  const getStatusIcon = () => {
    if (pendency.isComplete) {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    if (pendency.isWaiting) {
      return <Clock className="h-4 w-4 text-blue-500" />;
    }
    if (pendency.isOptional) {
      return <Circle className="h-4 w-4 text-gray-400" />;
    }
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  };

  const getResponsibleLabel = () => {
    switch (pendency.responsible) {
      case "collaborator":
        return "Colaborador";
      case "patient":
        return "Paciente";
      case "doctor":
        return "Médico";
      default:
        return "";
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        pendency.isComplete
          ? "bg-green-50 border-green-200"
          : pendency.isWaiting
            ? "bg-blue-50 border-blue-200"
            : pendency.isOptional
              ? "bg-gray-50 border-gray-200"
              : "bg-amber-50 border-amber-200",
        compact && "p-2",
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-medium text-sm",
              pendency.isComplete ? "text-green-700" : "text-gray-900",
            )}
          >
            {pendency.name}
          </span>

          {pendency.isOptional && (
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
              Opcional
            </span>
          )}

          {pendency.isWaiting && (
            <span className="px-1.5 py-0.5 bg-blue-200 text-blue-700 text-xs rounded">
              Aguardando
            </span>
          )}
        </div>

        {!compact && pendency.description && (
          <p className="text-xs text-gray-500 mt-0.5">{pendency.description}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            Responsável: {getResponsibleLabel()}
          </span>
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {pendency.isComplete ? (
          <span className="text-xs text-green-600 font-medium">✓ Completo</span>
        ) : pendency.isWaiting ? (
          <span className="text-xs text-blue-600 font-medium">Aguardando</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">Pendente</span>
        )}
      </div>
    </div>
  );
}
