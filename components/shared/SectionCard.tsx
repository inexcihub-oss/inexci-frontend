"use client";

import React from "react";

interface SectionCardProps {
  title: React.ReactNode;
  /** Elemento exibido no lado direito do cabeçalho (ex: botão "Adicionar") */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Card de seção reutilizável.
 * Usado nas abas da tela de detalhes para encapsular grupos de conteúdo.
 * Estrutura: borda + cabeçalho com título (e ação opcional) + conteúdo.
 */
export function SectionCard({
  title,
  headerAction,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div
      className={`border border-neutral-100 rounded-2xl overflow-hidden ${className}`}
    >
      <div className="ds-section-header">
        <h3 className="ds-section-title">{title}</h3>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

interface SectionCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

/** Corpo do SectionCard com padding padrão. */
export function SectionCardBody({
  children,
  className = "",
}: SectionCardBodyProps) {
  return <div className={`ds-section-body ${className}`}>{children}</div>;
}
