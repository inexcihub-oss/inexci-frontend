"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import Loading from "@/components/ui/Loading";
import { adminKeys } from "@/lib/query-keys";
import { formatDateTime } from "@/lib/utils";
import {
  adminService,
  type AdminSecurityPeriodDays,
} from "@/services/admin.service";

export function AccountSecurityLogs({
  ownerId,
  days,
  lokiAvailable,
}: {
  ownerId: string;
  days: AdminSecurityPeriodDays;
  lokiAvailable: boolean;
}) {
  const [requested, setRequested] = useState(false);
  const { data, isFetching, isError } = useQuery({
    queryKey: adminKeys.accountSecurityLogs(ownerId, days),
    queryFn: () => adminService.getAccountSecurityLogs(ownerId, days),
    enabled: requested && lokiAvailable,
  });

  if (!lokiAvailable) {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Os registros de autenticação vêm do Grafana, que não está configurado
        neste ambiente. As contagens acima continuam valendo.
      </p>
    );
  }

  if (!requested) {
    return (
      <button
        type="button"
        onClick={() => setRequested(true)}
        className="ds-toolbar-btn"
      >
        <ScrollText className="h-4 w-4" aria-hidden="true" />
        Carregar registros do Grafana
      </button>
    );
  }

  if (isFetching && !data) {
    return (
      <div className="flex justify-center py-6">
        <Loading size="md" />
      </div>
    );
  }

  if (isError || !data || data.lokiError === "unavailable") {
    return (
      <p role="alert" className="text-sm text-red-700">
        O Grafana não respondeu. Tente de novo em instantes.
      </p>
    );
  }

  if (data.logs.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Nenhum registro de autenticação no período.
      </p>
    );
  }

  return (
    <ul
      aria-label="Registros de autenticação"
      className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white"
    >
      {data.logs.map((line, i) => (
        <li key={`${line.timestamp}-${i}`} className="px-4 py-2.5">
          <p className="text-xs text-gray-500">
            {formatDateTime(line.timestamp)}
            {line.level ? ` · ${line.level}` : ""}
          </p>
          <p className="font-mono text-xs text-gray-800 [overflow-wrap:anywhere]">
            {line.message}
          </p>
        </li>
      ))}
    </ul>
  );
}
