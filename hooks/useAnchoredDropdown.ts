"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface DropdownPosition {
  top: number;
  bottom: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

export interface AnchoredDropdownOptions {
  placement?: "bottom" | "auto";
  maxHeight?: number;
}

export function useAnchoredDropdown(
  open: boolean,
  onClose?: () => void,
  options?: AnchoredDropdownOptions,
) {
  const placementPreferido = options?.placement ?? "bottom";
  const maxHeight = options?.maxHeight ?? 240;

  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition>({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const recalculate = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const alturaJanela = window.innerHeight;
    const espacoAbaixo = alturaJanela - rect.bottom;
    const espacoAcima = rect.top;
    const placement: "bottom" | "top" =
      placementPreferido === "auto" &&
      espacoAbaixo < maxHeight &&
      espacoAcima > espacoAbaixo
        ? "top"
        : "bottom";

    setPosition({
      top: rect.bottom,
      bottom: alturaJanela - rect.top,
      left: rect.left,
      width: rect.width,
      placement,
    });
  }, [placementPreferido, maxHeight]);

  useLayoutEffect(() => {
    if (!open) return;
    recalculate();
  }, [open, recalculate]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("scroll", recalculate, true);
    window.addEventListener("resize", recalculate);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", recalculate);
    viewport?.addEventListener("scroll", recalculate);

    return () => {
      window.removeEventListener("scroll", recalculate, true);
      window.removeEventListener("resize", recalculate);
      viewport?.removeEventListener("resize", recalculate);
      viewport?.removeEventListener("scroll", recalculate);
    };
  }, [open, recalculate]);

  useEffect(() => {
    if (!open || !onCloseRef.current) return;

    const handle = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      onCloseRef.current?.();
    };

    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  return { anchorRef, dropdownRef, position, recalculate };
}
