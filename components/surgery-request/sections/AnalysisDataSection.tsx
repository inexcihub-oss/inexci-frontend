"use client";

import React from "react";
import { SectionCard, SectionCardBody } from "@/components/shared/SectionCard";

interface AnalysisDataSectionProps {
  analysis: {
    request_number?: string | null;
    received_at?: string | null;
    quotation_1_number?: string | null;
    quotation_1_received_at?: string | null;
    quotation_2_number?: string | null;
    quotation_2_received_at?: string | null;
    quotation_3_number?: string | null;
    quotation_3_received_at?: string | null;
    notes?: string | null;
  };
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(dateStr);
  return d.toLocaleDateString("pt-BR");
}

/**
 * Seção de dados da análise exibida em Informações Gerais a partir do status 3.
 * Referência: telas-inexci/status/em-analise/tela-detalhes-status-em-analise.png
 */
export function AnalysisDataSection({ analysis }: AnalysisDataSectionProps) {
  const quotations = [
    {
      number: analysis.quotation_1_number,
      date: analysis.quotation_1_received_at,
    },
    {
      number: analysis.quotation_2_number,
      date: analysis.quotation_2_received_at,
    },
    {
      number: analysis.quotation_3_number,
      date: analysis.quotation_3_received_at,
    },
  ].filter((q) => q.number);

  const hasQuotationData = quotations.length > 0 || !!analysis.notes;

  return (
    <div className="space-y-2.5">
      {/* Dados da Solicitação */}
      <SectionCard title="Dados da solicitação">
        <SectionCardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Nº da solicitação</label>
              <div className="ds-field-readonly">
                {analysis.request_number ?? "—"}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="ds-label mb-0">Data de recebimento</label>
              <div className="ds-field-readonly">
                {formatDate(analysis.received_at)}
              </div>
            </div>
          </div>
        </SectionCardBody>
      </SectionCard>

      {/* Dados da cotação (apenas se houver cotações ou observações preenchidas) */}
      {hasQuotationData && (
        <SectionCard title="Dados da cotação">
          <SectionCardBody>
            <div className="flex flex-col gap-3 md:gap-4">
              {quotations.map((q, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="ds-label mb-0">
                      Nº proposta de cotação
                    </label>
                    <div className="ds-field-readonly">{q.number}</div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="ds-label mb-0">Data de recebimento</label>
                    <div className="ds-field-readonly">
                      {formatDate(q.date)}
                    </div>
                  </div>
                </div>
              ))}

              {analysis.notes && (
                <div className="flex flex-col gap-1.5">
                  <label className="ds-label mb-0">Observações</label>
                  <div className="ds-field-readonly min-h-20 whitespace-pre-wrap">
                    {analysis.notes}
                  </div>
                </div>
              )}
            </div>
          </SectionCardBody>
        </SectionCard>
      )}
    </div>
  );
}
