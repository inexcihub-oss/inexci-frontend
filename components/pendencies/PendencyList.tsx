"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Pendency,
  GroupedPendencies,
  PendenciesSummary,
} from "@/types/surgery-request.types";
import { PendencyItem } from "./PendencyItem";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface PendencyListProps {
  pendencies: Pendency[];
  onCompletePendency?: (pendencyId: string) => Promise<void>;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

export function PendencyList({
  pendencies,
  onCompletePendency,
  showProgress = true,
  compact = false,
  className,
}: PendencyListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const completed = pendencies.filter((p) => p.concluded).length;
  const total = pendencies.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const handleComplete = async (pendencyId: string) => {
    if (!onCompletePendency) return;

    setLoadingId(pendencyId);
    try {
      await onCompletePendency(pendencyId);
    } finally {
      setLoadingId(null);
    }
  };

  if (pendencies.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhuma pendência encontrada</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso das Pendências</span>
            <span className="font-medium text-gray-900">
              {completed} de {total} concluídas
            </span>
          </div>
          <ProgressBar
            value={progress}
            variant={progress === 100 ? "success" : "primary"}
          />
        </div>
      )}

      <div className={cn(compact ? "space-y-1" : "space-y-2")}>
        {pendencies.map((pendency) => (
          <PendencyItem
            key={pendency.id}
            pendency={pendency}
            onComplete={onCompletePendency ? handleComplete : undefined}
            isLoading={loadingId === pendency.id}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

interface GroupedPendencyListProps {
  groupedPendencies: GroupedPendencies;
  onCompletePendency?: (pendencyId: string) => Promise<void>;
  className?: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  completed: "Concluídas",
  waiting: "Aguardando",
  optional: "Opcionais",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: AlertCircle,
  completed: CheckCircle2,
  waiting: Clock,
  optional: CheckCircle2,
};

const statusColors: Record<string, string> = {
  pending: "text-red-500",
  completed: "text-green-500",
  waiting: "text-amber-500",
  optional: "text-blue-500",
};

export function GroupedPendencyList({
  groupedPendencies,
  onCompletePendency,
  className,
}: GroupedPendencyListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      pending: true,
      waiting: true,
      optional: false,
      completed: false,
    },
  );

  const handleComplete = async (pendencyId: string) => {
    if (!onCompletePendency) return;

    setLoadingId(pendencyId);
    try {
      await onCompletePendency(pendencyId);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const groups = [
    { key: "pending", items: groupedPendencies.pending },
    { key: "waiting", items: groupedPendencies.waiting },
    { key: "optional", items: groupedPendencies.optional },
    { key: "completed", items: groupedPendencies.completed },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>Nenhuma pendência encontrada</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map(({ key, items }) => {
        const Icon = statusIcons[key];
        const isExpanded = expandedGroups[key];

        return (
          <div
            key={key}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleGroup(key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-5 w-5", statusColors[key])} />
                <span className="font-medium text-gray-900">
                  {statusLabels[key]}
                </span>
                <span className="text-sm text-gray-500">({items.length})</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="p-3 space-y-2">
                {items.map((pendency) => (
                  <PendencyItem
                    key={pendency.id}
                    pendency={pendency}
                    onComplete={onCompletePendency ? handleComplete : undefined}
                    isLoading={loadingId === pendency.id}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface PendencySummaryCardProps {
  summary: PendenciesSummary;
  className?: string;
}

export function PendencySummaryCard({
  summary,
  className,
}: PendencySummaryCardProps) {
  const progress =
    summary.total > 0 ? (summary.completed / summary.total) * 100 : 0;

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Resumo das Pendências</h3>
        <span
          className={cn(
            "text-sm font-medium",
            progress === 100 ? "text-green-600" : "text-gray-600",
          )}
        >
          {Math.round(progress)}%
        </span>
      </div>

      <ProgressBar
        value={progress}
        variant={progress === 100 ? "success" : "primary"}
        size="md"
        className="mb-4"
      />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Pendentes:</span>
          <span className="font-medium">{summary.pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Concluídas:</span>
          <span className="font-medium">{summary.completed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">Aguardando:</span>
          <span className="font-medium">{summary.waiting}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Opcionais:</span>
          <span className="font-medium">{summary.optional}</span>
        </div>
      </div>

      {!summary.canTransition && summary.pending > 0 && (
        <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Complete todas as pendências obrigatórias para avançar o status.
        </p>
      )}

      {summary.canTransition && (
        <p className="mt-3 text-xs text-green-600 bg-green-50 p-2 rounded">
          ✓ Todas as pendências obrigatórias foram concluídas!
        </p>
      )}
    </div>
  );
}
