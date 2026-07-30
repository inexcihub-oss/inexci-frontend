"use client";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { cn } from "@/lib/utils";
import { MiniMonthCalendar } from "./MiniMonthCalendar";

interface Props {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Elemento clicável que abre o calendário. */
  trigger: React.ReactNode;
  align?: "left" | "right";
  /** Classe extra na raiz (ex.: `flex-1 min-w-0` para o gatilho truncar). */
  className?: string;
}

/**
 * Abre um calendário ancorado ao `trigger`. Renderiza via portal com posição
 * fixed para não ser recortado por containers com overflow-hidden (ex.: modais).
 */
export function DatePickerPopover({
  value,
  onChange,
  trigger,
  align = "left",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const POP_WIDTH = 272; // 256 (calendário) + padding

  const place = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    let left = align === "right" ? rect.right - POP_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - POP_WIDTH - 8));
    setPos({ top: rect.bottom + 6, left });
  };

  const toggle = () => {
    if (!open) place();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !anchorRef.current?.contains(t) &&
        !popRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onScrollOrResize = () => place();
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={anchorRef} className={cn("inline-flex", className)}>
      <span onClick={toggle} className="inline-flex min-w-0 max-w-full">
        {trigger}
      </span>

      {open &&
        typeof window !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={popRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="bg-white border border-neutral-200 rounded-2xl shadow-xl p-3"
          >
            <MiniMonthCalendar
              selected={value}
              initialMonth={value ?? undefined}
              onSelect={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
