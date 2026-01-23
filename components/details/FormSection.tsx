"use client";

import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({
  title,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <div
      className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {/* Header da seção */}
      <div className="flex items-center px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      {/* Conteúdo do formulário */}
      <div className="p-4">{children}</div>
    </div>
  );
}
