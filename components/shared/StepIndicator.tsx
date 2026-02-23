"use client";

import React from "react";

interface StepIndicatorProps {
  /** Total de etapas */
  totalSteps: number;
  /** Etapa atual (1-indexed) */
  currentStep: number;
  className?: string;
}

/**
 * Indicador visual de etapas reutilizável.
 * Exibe círculos numerados conectados por linhas.
 * - Etapa atual: fundo teal escuro
 * - Etapas anteriores: fundo teal claro
 * - Etapas futuras: fundo cinza
 */
export function StepIndicator({
  totalSteps,
  currentStep,
  className = "",
}: StepIndicatorProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <React.Fragment key={step}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              step === currentStep
                ? "bg-teal-700 text-white"
                : step < currentStep
                  ? "bg-teal-100 text-teal-700"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {step}
          </div>
          {step < totalSteps && <div className="w-4 h-px bg-gray-200" />}
        </React.Fragment>
      ))}
    </div>
  );
}
