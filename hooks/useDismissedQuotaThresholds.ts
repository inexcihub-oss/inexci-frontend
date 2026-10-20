"use client";

import { useCallback, useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import {
  quotaDismissKey,
  type QuotaThreshold,
} from "@/lib/quota-banner";

const THRESHOLDS: QuotaThreshold[] = ["medium", "high", "critical"];

export function useDismissedQuotaThresholds(
  accountId: string | null,
  periodEnd: string | null | undefined,
) {
  const [dismissed, setDismissed] = useState<QuotaThreshold[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!accountId || !periodEnd) {
      setDismissed([]);
      setPronto(!!accountId);
      return;
    }

    try {
      setDismissed(
        THRESHOLDS.filter(
          (threshold) =>
            window.localStorage.getItem(
              quotaDismissKey(accountId, periodEnd, threshold),
            ) === "1",
        ),
      );
    } catch (error) {
      logger.warn("Não foi possível ler a dispensa do aviso de cota:", error);
      setDismissed([]);
    }
    setPronto(true);
  }, [accountId, periodEnd]);

  const dismiss = useCallback(
    (threshold: QuotaThreshold) => {
      setDismissed((atual) =>
        atual.includes(threshold) ? atual : [...atual, threshold],
      );
      if (!accountId || !periodEnd) return;
      try {
        window.localStorage.setItem(
          quotaDismissKey(accountId, periodEnd, threshold),
          "1",
        );
      } catch (error) {
        logger.warn("Não foi possível salvar a dispensa do aviso de cota:", error);
      }
    },
    [accountId, periodEnd],
  );

  return { dismissed, dismiss, pronto };
}
