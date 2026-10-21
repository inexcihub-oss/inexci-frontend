"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloseCashSessionModal } from "@/components/finance/cash/CloseCashSessionModal";
import { formatDateTime } from "@/components/finance/receivables/format";
import { financeService } from "@/services/finance.service";
import { financeKeys } from "@/lib/query-keys";

interface OtherOpenCashSessionsProps {
  currentUserId: string | null;
}

const PARAMS = { page: 1, limit: 100 };

export function OtherOpenCashSessions({
  currentUserId,
}: OtherOpenCashSessionsProps) {
  const [fechando, setFechando] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: financeKeys.cashSessionList(PARAMS),
    queryFn: () => financeService.listCashSessions(PARAMS),
  });
  const resumo = useQuery({
    queryKey: financeKeys.cashSession(fechando ?? ""),
    queryFn: () => financeService.getCashSession(fechando as string),
    enabled: !!fechando,
  });

  const abertos = (data?.data ?? []).filter(
    (s) => s.closedAt === null && s.user.id !== currentUserId,
  );
  if (abertos.length === 0) return null;

  return (
    <section aria-labelledby="caixas-abertos-outros" className="flex flex-col gap-2">
      <h3
        id="caixas-abertos-outros"
        className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
      >
        Caixas abertos de outros usuários
      </h3>
      <ul className="flex flex-col divide-y divide-neutral-100 border border-amber-200 bg-amber-50/40 rounded-xl">
        {abertos.map((s) => (
          <li key={s.id} className="px-3 py-2.5 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {s.user.name} · {s.account.name}
              </p>
              <p className="text-xs text-neutral-500">
                Aberto em {formatDateTime(s.openedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFechando(s.id)}
              className="ds-btn-inline inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fechar
            </button>
          </li>
        ))}
      </ul>
      {fechando && resumo.data && (
        <CloseCashSessionModal
          isOpen
          ofOtherUser
          session={resumo.data}
          onClose={() => setFechando(null)}
        />
      )}
    </section>
  );
}
