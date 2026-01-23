"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface PendencyBadgeProps {
  /**
   * Total number of pendencies
   */
  total: number;
  /**
   * Number of completed pendencies
   */
  completed?: number;
  /**
   * Number of pending (not completed) pendencies
   */
  pending?: number;
  /**
   * Number of waiting pendencies
   */
  waiting?: number;
  /**
   * Whether to show tooltip with details
   */
  showTooltip?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  /**
   * Additional className
   */
  className?: string;
}

export function PendencyBadge({
  total,
  completed = 0,
  pending,
  waiting = 0,
  showTooltip = true,
  size = "md",
  className,
}: PendencyBadgeProps) {
  // Calculate pending if not provided
  const actualPending = pending ?? total - completed;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Determine badge style based on status
  const isComplete = actualPending === 0 && total > 0;
  const hasWaiting = waiting > 0;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-0.5",
    md: "px-3 py-1 text-xs gap-1",
    lg: "px-3 py-1.5 text-sm gap-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  const getBadgeStyle = () => {
    if (isComplete) {
      return "bg-green-50 text-green-700 border-green-300";
    }
    if (hasWaiting && actualPending === 0) {
      return "bg-amber-50 text-amber-700 border-amber-300";
    }
    if (actualPending > 0) {
      return "bg-red-50 text-red-600 border-red-300";
    }
    return "bg-gray-50 text-gray-600 border-gray-300";
  };

  const getIcon = () => {
    if (isComplete) {
      return <CheckCircle className={cn(iconSizes[size], "text-green-500")} />;
    }
    if (hasWaiting && actualPending === 0) {
      return <Clock className={cn(iconSizes[size], "text-amber-500")} />;
    }
    return <AlertCircle className={cn(iconSizes[size], "text-red-500")} />;
  };

  const badge = (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border",
        sizeClasses[size],
        getBadgeStyle(),
        className,
      )}
    >
      {getIcon()}
      <span>{isComplete ? "Concluído" : `${completed}/${total}`}</span>
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-medium border-b border-gray-600 pb-1 mb-1">
        Pendências ({progress}%)
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Concluídas:</span>
        <span className="text-green-400">{completed}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-300">Pendentes:</span>
        <span className="text-red-400">{actualPending}</span>
      </div>
      {waiting > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-300">Aguardando:</span>
          <span className="text-amber-400">{waiting}</span>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top">
      {badge}
    </Tooltip>
  );
}
