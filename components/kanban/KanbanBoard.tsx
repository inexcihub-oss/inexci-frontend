"use client";

import React, { memo } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanColumn as KanbanColumnType } from "@/types/surgery-request.types";

interface KanbanBoardProps {
  initialColumns: KanbanColumnType[];
}

export const KanbanBoard = memo<KanbanBoardProps>(({ initialColumns }) => {
  return (
    <div className="flex items-start gap-3 lg:gap-4 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory lg:snap-none pb-4 px-4 md:px-0 -mx-4 md:mx-0">
      {initialColumns.map((column) => (
        <KanbanColumn
          key={column.id}
          columnId={column.id}
          title={column.title}
          status={column.status}
          count={column.cards.length}
          cards={column.cards}
        />
      ))}
    </div>
  );
});

KanbanBoard.displayName = "KanbanBoard";
