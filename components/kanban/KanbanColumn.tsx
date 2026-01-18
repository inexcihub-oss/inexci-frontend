"use client";

import React, { memo } from "react";
import { ProcedureCard } from "./ProcedureCard";
import { SurgeryRequest } from "@/types/surgery-request.types";
import { EmptyState } from "@/components/ui/EmptyState";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  count: number;
  cards: SurgeryRequest[];
}

export const KanbanColumn = memo<KanbanColumnProps>(
  ({ columnId, title, count, cards }) => {
    return (
      <div className="flex flex-col gap-3 flex-shrink-0 w-90 h-full">
        {/* Cabeçalho da coluna */}
        <div className="flex items-center gap-3 w-full flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center justify-center min-w-8 h-6 px-3 bg-white border border-gray-200 rounded-full">
            <span className="text-sm font-semibold text-gray-900">{count}</span>
          </div>
        </div>

        {/* Área de cards com scroll */}
        <div
          className="flex flex-col w-full gap-3 p-3 rounded-xl bg-gray-50 flex-1 overflow-y-auto scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {cards.length === 0 ? (
            <EmptyState
              title="Nenhuma solicitação"
              description={`Não há solicitações com status "${title}"`}
              className="py-8"
            />
          ) : (
            cards.map((card) => (
              <ProcedureCard key={card.id} procedure={card} />
            ))
          )}
        </div>
      </div>
    );
  },
);

KanbanColumn.displayName = "KanbanColumn";
