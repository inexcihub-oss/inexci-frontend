"use client";

import React, { memo } from "react";
import Image from "next/image";
import { ProcedureCard } from "./ProcedureCard";
import {
  SurgeryRequest,
  SurgeryRequestStatus,
} from "@/types/surgery-request.types";
import { EmptyState } from "@/components/ui/EmptyState";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  status: SurgeryRequestStatus;
  count: number;
  cards: SurgeryRequest[];
}

// Mapeamento de status para ícones SVG
const statusIconMap: Record<SurgeryRequestStatus, string> = {
  Pendente: "/icons/kanban/clock-watch.svg",
  Enviada: "/icons/kanban/email-send-fast-circle.svg",
  "Em Análise": "/icons/kanban/loading-waiting.svg",
  "Em Agendamento": "/icons/kanban/calendar-chedule-clock.svg",
  Agendada: "/icons/kanban/calendar-schedule-checkmark.svg",
  Realizada: "/icons/kanban/hospital-board-square.svg",
  Faturada: "/icons/kanban/coins.svg",
  Finalizada: "/icons/kanban/checkmark-circle-1.svg",
  Cancelada: "/icons/kanban/Delete, Disabled.svg",
};

export const KanbanColumn = memo<KanbanColumnProps>(
  ({ columnId, title, status, count, cards }) => {
    const iconPath = statusIconMap[status] || "/icons/kanban/clock-watch.svg";

    return (
      <div className="flex flex-col flex-shrink-0 w-80 h-full">
        {/* Header da coluna - Design Figma */}
        <div className="flex items-center gap-2 px-4 py-4 bg-gray-100 border-b border-gray-200 rounded-t-lg">
          <Image
            src={iconPath}
            alt={status}
            width={24}
            height={24}
            className="flex-shrink-0"
          />
          <h2 className="font-semibold text-base text-gray-900 leading-normal">
            {title}
          </h2>
          <div className="flex items-center justify-center min-w-6 h-6 px-1 bg-white border border-gray-200 rounded-full">
            <span className="text-xs font-semibold text-gray-900 leading-none">
              {count}
            </span>
          </div>
        </div>

        {/* Área de cards com scroll */}
        <div
          className="flex flex-col gap-2 p-4 bg-gray-100 flex-1 overflow-y-auto rounded-b-lg"
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
