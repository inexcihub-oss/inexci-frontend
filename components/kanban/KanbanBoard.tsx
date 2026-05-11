"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanColumn as KanbanColumnType } from "@/types/surgery-request.types";

interface KanbanBoardProps {
  initialColumns: KanbanColumnType[];
}

export const KanbanBoard = memo<KanbanBoardProps>(({ initialColumns }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    const { scrollLeft, scrollWidth, clientWidth } = element;
    const maxScrollLeft = scrollWidth - clientWidth;

    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    updateScrollState();

    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, initialColumns]);

  const scrollByAmount = useCallback((direction: "left" | "right") => {
    const element = scrollRef.current;
    if (!element) return;

    const amount = Math.max(280, Math.floor(element.clientWidth * 0.35));
    element.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="flex items-start gap-3 lg:gap-4 h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory lg:snap-none pb-4 px-1 sm:px-0"
      >
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

      <div className="hidden lg:flex items-center gap-2 absolute bottom-2 right-2 z-10 rounded-2xl border border-teal-200 bg-teal-50/95 backdrop-blur px-2 py-1.5 shadow-md">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          disabled={!canScrollLeft}
          aria-label="Rolar kanban para a esquerda"
          className="h-9 w-9 rounded-full border border-teal-700/20 bg-teal-700 text-white shadow-sm flex items-center justify-center hover:bg-teal-800 disabled:bg-teal-200 disabled:text-white/70 disabled:border-teal-200 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          disabled={!canScrollRight}
          aria-label="Rolar kanban para a direita"
          className="h-9 w-9 rounded-full border border-teal-700/20 bg-teal-700 text-white shadow-sm flex items-center justify-center hover:bg-teal-800 disabled:bg-teal-200 disabled:text-white/70 disabled:border-teal-200 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

KanbanBoard.displayName = "KanbanBoard";
