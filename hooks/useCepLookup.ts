"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CepLookupError,
  CepLookupResult,
  isCompleteCep,
  lookupCep,
} from "@/lib/cep";
import { unmask } from "@/lib/masks";

export interface UseCepLookupOptions {
  cep: string | undefined | null;
  onResolved: (data: CepLookupResult) => void;
  onError?: (error: CepLookupError) => void;
  enabled?: boolean;
}

export interface UseCepLookupReturn {
  loading: boolean;
  error: CepLookupError | null;
  refresh: () => void;
}

export function useCepLookup({
  cep,
  onResolved,
  onError,
  enabled = true,
}: UseCepLookupOptions): UseCepLookupReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CepLookupError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFetchedRef = useRef<string | null>(null);

  const onResolvedRef = useRef(onResolved);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResolvedRef.current = onResolved;
    onErrorRef.current = onError;
  });

  const run = useCallback(async (digits: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await lookupCep(digits, controller.signal);
      if (controller.signal.aborted) return;
      lastFetchedRef.current = digits;
      onResolvedRef.current(result);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const cepErr =
        err instanceof CepLookupError
          ? err
          : new CepLookupError(
              "Erro ao consultar CEP. Tente novamente.",
              "network",
            );
      setError(cepErr);
      onErrorRef.current?.(cepErr);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const digits = unmask(cep);
    if (!isCompleteCep(digits)) {
      lastFetchedRef.current = null;
      setError(null);
      return;
    }
    if (lastFetchedRef.current === digits) return;
    run(digits);
  }, [cep, enabled, run]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const refresh = useCallback(() => {
    const digits = unmask(cep);
    if (isCompleteCep(digits)) {
      lastFetchedRef.current = null;
      run(digits);
    }
  }, [cep, run]);

  return { loading, error, refresh };
}
