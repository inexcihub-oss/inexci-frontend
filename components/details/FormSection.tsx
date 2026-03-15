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
      className={`border border-gray-200 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Header da seção */}
      <div className="ds-section-header">
        <h3 className="ds-section-title">{title}</h3>
      </div>

      {/* Conteúdo do formulário */}
      <div className="ds-section-body">{children}</div>
    </div>
  );
}
