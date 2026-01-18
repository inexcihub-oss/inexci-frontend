"use client";

import React, { memo } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanColumn as KanbanColumnType } from "@/types/surgery-request.types";

interface KanbanBoardProps {
  initialColumns: KanbanColumnType[];
}

export const KanbanBoard = memo<KanbanBoardProps>(({ initialColumns }) => {
  return (
    <div
      className="flex items-start gap-6 h-full overflow-x-auto overflow-y-hidden pb-2 scrollbar-hide"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {initialColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          columnId={column.id}
          title={column.title}
          count={column.cards.length}
          cards={column.cards}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = "KanbanBoard";
