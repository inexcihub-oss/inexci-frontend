"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";
import type { AppointmentFinanceStatusDto } from "@/types/finance.types";

export const LIMITE_DE_IDS_POR_CHAMADA = 200;

export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho));
  }
  return lotes;
}

export async function buscarStatusEmLotes(
  ids: string[],
): Promise<AppointmentFinanceStatusDto[]> {
  const respostas = await Promise.all(
    emLotes(ids, LIMITE_DE_IDS_POR_CHAMADA).map((lote) =>
      financeService.getAppointmentsStatus(lote),
    ),
  );
  return respostas.flat();
}

export function useAppointmentsFinanceStatus(
  appointmentIds: string[],
  enabled: boolean,
) {
  const ids = useMemo(
    () => Array.from(new Set(appointmentIds)).sort(),
    [appointmentIds],
  );
  const query = useQuery({
    queryKey: financeKeys.appointmentStatus(ids),
    queryFn: () => buscarStatusEmLotes(ids),
    enabled: enabled && ids.length > 0,
  });
  const porConsulta = useMemo(() => {
    const mapa = new Map<string, AppointmentFinanceStatusDto>();
    if (!enabled) return mapa;
    for (const item of query.data ?? []) mapa.set(item.appointmentId, item);
    return mapa;
  }, [enabled, query.data]);
  return { ...query, porConsulta };
}

export function useAppointmentFinanceStatus(
  appointmentId: string,
  enabled: boolean,
) {
  const ids = useMemo(() => [appointmentId], [appointmentId]);
  const { porConsulta, ...query } = useAppointmentsFinanceStatus(ids, enabled);
  return { ...query, status: porConsulta.get(appointmentId) ?? null };
}
