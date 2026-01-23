import { useEffect, RefObject, useCallback } from "react";

/**
 * Hook para detectar cliques fora de um elemento
 * IMPORTANTE: O handler deve ser estável (useCallback) para evitar re-execuções do useEffect
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
) {
  // Memoiza o handler para evitar que mudanças de referência disparem o useEffect
  const stableHandler = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    },
    [ref, handler],
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("mousedown", stableHandler);
    document.addEventListener("touchstart", stableHandler);

    return () => {
      document.removeEventListener("mousedown", stableHandler);
      document.removeEventListener("touchstart", stableHandler);
    };
  }, [stableHandler, enabled]);
}
