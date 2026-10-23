"use client";

import { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";

export type ModoFicha = "secoes" | "livre";

export const modoFichaKey = (userId: string) => `ficha-modo:${userId}`;

export function useModoFicha(userId: string | null | undefined) {
  const [modo, setModoState] = useState<ModoFicha>("secoes");

  useEffect(() => {
    if (!userId) return;
    try {
      const salvo = window.localStorage.getItem(modoFichaKey(userId));
      setModoState(salvo === "livre" ? "livre" : "secoes");
    } catch (error) {
      logger.warn("Não foi possível ler o modo da ficha:", error);
    }
  }, [userId]);

  const setModo = useCallback(
    (novo: ModoFicha) => {
      setModoState(novo);
      if (!userId) return;
      try {
        window.localStorage.setItem(modoFichaKey(userId), novo);
      } catch (error) {
        logger.warn("Não foi possível salvar o modo da ficha:", error);
      }
    },
    [userId],
  );

  return { modo, setModo };
}
