"use client";

import { cn } from "@/lib/utils";
import { CalculatedPendency } from "@/services/pendency.service";
import { Check, Clock, AlertCircle, Circle, ChevronDown } from "lucide-react";
import { useState } from "react";

interface DynamicPendencyListProps {
  pendencies: CalculatedPendency[] | undefined | null;
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
  // Filtra itens opcionais que já estão completos — não há nada a exibir para eles.
  // Ex: 'contest_pending' aparece como completo quando não há contestação ativa;
  // só deve ser exibido quando há contestação pendente (isOptional && !isComplete).
  const displayPendencies = (pendencies ?? []).filter(
    (p) => !(p.isOptional && p.isComplete),
  );

  const displayTotal = displayPendencies.length;
  const displayCompleted = displayPendencies.filter((p) => p.isComplete).length;
  const progress =
    displayTotal > 0 ? (displayCompleted / displayTotal) * 100 : 100;

  if (displayPendencies.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
        <p>Nenhuma pendência para este status</p>
      </div>
    );
  }

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
          {displayCompleted} de {displayTotal} concluídas
        </div>
      </div>

      {/* Lista de pendências */}
      <div className={cn(compact ? "space-y-1" : "space-y-2")}>
        {displayPendencies.map((pendency) => (
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
  const [expanded, setExpanded] = useState(false);
  const hasCheckItems = pendency.checkItems && pendency.checkItems.length > 0;
  const isClickable = hasCheckItems && !pendency.isComplete;

  const getStatusIcon = () => {
    if (pendency.isComplete)
      return <Check className="h-4 w-4 text-green-600 flex-shrink-0" />;
    if (pendency.isWaiting)
      return <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    if (pendency.isOptional)
      return <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />;
    return <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        pendency.isComplete
          ? "bg-green-50 border-green-200"
          : pendency.isWaiting
            ? "bg-blue-50 border-blue-200"
            : pendency.isOptional
              ? "bg-blue-50 border-blue-200"
              : "bg-amber-50 border-amber-200",
      )}
    >
      {/* Linha principal */}
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5",
          compact && "py-2",
          isClickable && "cursor-pointer select-none",
        )}
        onClick={() => isClickable && setExpanded((v) => !v)}
      >
        {getStatusIcon()}

        <span
          className={cn(
            "flex-1 text-sm font-semibold leading-tight",
            pendency.isComplete
              ? "text-green-700"
              : pendency.isOptional
                ? "text-blue-700"
                : "text-gray-900",
          )}
        >
          {pendency.name}
          {pendency.isOptional && (
            <span className="ml-1.5 text-xs font-normal text-gray-400">
              (opcional)
            </span>
          )}
        </span>

        <div className="flex items-center gap-1 flex-shrink-0">
          {pendency.isComplete ? (
            <span className="text-xs text-green-600 font-semibold">
              Completo
            </span>
          ) : pendency.isWaiting ? (
            <span className="text-xs text-blue-600 font-semibold">
              Aguardando
            </span>
          ) : pendency.isOptional ? (
            <span className="text-xs text-blue-600 font-semibold">
              Lembrete
            </span>
          ) : (
            <span className="text-xs text-amber-600 font-semibold">
              Pendente
            </span>
          )}
          {isClickable && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform",
                expanded && "rotate-180",
              )}
            />
          )}
        </div>
      </div>

      {/* Sub-itens expandidos */}
      {expanded && hasCheckItems && (
        <div
          className={cn(
            "mx-3 mb-2.5 rounded-lg overflow-hidden border",
            pendency.isOptional ? "border-gray-200" : "border-amber-200",
          )}
        >
          {pendency.checkItems!.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm",
                i > 0 && "border-t border-amber-100",
                item.done ? "bg-green-50" : "bg-white",
              )}
            >
              {item.done ? (
                <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-xs leading-snug",
                  item.done
                    ? "text-green-700 line-through decoration-green-400"
                    : "text-gray-700",
                )}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
