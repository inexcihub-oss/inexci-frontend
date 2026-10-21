"use client";

import { useCallback, useSyncExternalStore } from "react";

export const MOBILE_QUERY = "(max-width: 639px)";

function suportaMatchMedia(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function";
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!suportaMatchMedia()) return () => undefined;
      const lista = window.matchMedia(query);
      lista.addEventListener("change", onChange);
      return () => lista.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    suportaMatchMedia() ? window.matchMedia(query).matches : false;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
