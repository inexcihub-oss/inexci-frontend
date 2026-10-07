"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface DropdownPosition {
  top: number;
  /** Distância do fundo da janela até o topo do campo — usada quando a lista abre para cima. */
  bottom: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

export interface AnchoredDropdownOptions {
  /**
   * `"auto"` vira a lista para cima quando não cabe abaixo. É o que o
   * bottom-sheet do mobile exige: o campo fica no rodapé da folha e uma
   * lista aberta para baixo nasceria fora da tela.
   */
  placement?: "bottom" | "auto";
  /** Altura máxima esperada da lista (default 240px = `max-h-60`). */
  maxHeight?: number;
}

/**
 * Posiciona um dropdown renderizado em portal logo abaixo do campo que o
 * ancora.
 *
 * Dentro de um modal, um dropdown `absolute` fica preso ao corpo rolável e é
 * cortado nas bordas — por isso a lista vai para um portal com `position:
 * fixed`, e a posição precisa acompanhar rolagem e redimensionamento.
 */
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

    // `true` na captura: o scroll costuma acontecer no corpo do modal, não na
    // janela, e eventos de rolagem não borbulham.
    window.addEventListener("scroll", recalculate, true);
    window.addEventListener("resize", recalculate);
    // Teclado virtual no mobile: só o visualViewport avisa que a área
    // visível encolheu, e sem isso a lista descola do campo.
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

  /**
   * O dropdown vive em portal, fora da árvore do campo — por isso o "clique
   * fora" precisa considerar os dois elementos. Checando só o campo, o clique
   * na opção fecharia a lista antes de o `onClick` do item disparar, e
   * escolher um item ficaria impossível.
   */
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
