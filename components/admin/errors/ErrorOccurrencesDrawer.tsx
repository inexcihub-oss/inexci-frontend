"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Loading from "@/components/ui/Loading";
import { ERROR_SOURCE_LABEL } from "@/lib/admin-errors";
import { adminKeys } from "@/lib/query-keys";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  adminService,
  type AdminErrorFingerprint,
  type AdminErrorPeriodDays,
} from "@/services/admin.service";

const LOKI_NOTICE = {
  not_configured:
    "O detalhe completo vem do Grafana, que ainda não está configurado neste ambiente. Abaixo ficam só as contagens.",
  unavailable:
    "Não foi possível consultar o Grafana agora. Abaixo ficam só as contagens; tente de novo em instantes.",
} as const;

export function ErrorOccurrencesDrawer({
  item,
  days,
  ownerId,
  onClose,
}: {
  item: AdminErrorFingerprint | null;
  days: AdminErrorPeriodDays;
  ownerId?: string;
  onClose: () => void;
}) {
  const fingerprint = item?.fingerprint ?? "";
  const params = { days, ...(ownerId ? { ownerId } : {}) };
  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.errorOccurrences(fingerprint, params),
    queryFn: () => adminService.getErrorOccurrences(fingerprint, params),
    enabled: !!item,
  });

  return (
    <Modal
      isOpen={!!item}
      onClose={onClose}
      variant="drawer"
      size="lg"
      title={item ? ERROR_SOURCE_LABEL[item.source] : "Ocorrências"}
    >
      {item && (
        <div className="space-y-5">
          <section aria-label="Erro" className="space-y-1">
            <p className="break-words text-sm font-medium text-gray-900">
              {item.lastMessage ?? "Erro sem mensagem"}
            </p>
            {item.route && (
              <p className="break-all font-mono text-xs text-gray-500">
                {item.route}
              </p>
            )}
            {item.errorClass && (
              <p className="text-xs text-gray-500">{item.errorClass}</p>
            )}
          </section>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" />
            </div>
          ) : isError || !data ? (
            <p role="alert" className="text-sm text-red-700">
              Não foi possível carregar as ocorrências.
            </p>
          ) : (
            <>
              <section aria-label="Ocorrências por dia" className="space-y-2">
                <h3 className="ds-section-title">Ocorrências por dia</h3>
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {data.occurrences.map((o) => (
                    <li
                      key={`${o.day}-${o.ownerId ?? "sem-conta"}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {formatDate(`${o.day}T12:00:00`)} · {o.count}×
                        </p>
                        <p className="text-xs text-gray-500">
                          {o.ownerId ? (
                            <Link
                              href={`/admin/clientes/${o.ownerId}?tab=erros`}
                              className="text-teal-700 underline"
                            >
                              {o.ownerName ?? "Abrir conta"}
                            </Link>
                          ) : (
                            "Sem conta vinculada"
                          )}
                          {o.lastRequestId && (
                            <span className="ml-1 font-mono">
                              · {o.lastRequestId.slice(0, 8)}
                            </span>
                          )}
                        </p>
                      </div>
                      {o.exploreUrl && (
                        <a
                          href={o.exploreUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ds-toolbar-btn"
                        >
                          <ExternalLink
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          Grafana
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Logs do Grafana" className="space-y-2">
                <h3 className="ds-section-title">Logs do Grafana</h3>
                {data.lokiError ? (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {LOKI_NOTICE[data.lokiError]}
                  </p>
                ) : data.logs.length === 0 ? (
                  <p className="ds-caption">
                    Nenhuma linha de log encontrada para as ocorrências
                    recentes.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {data.logs.map((line, i) => (
                      <li
                        key={`${line.timestamp}-${i}`}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <p className="text-xs text-gray-500">
                          {formatDateTime(line.timestamp)}
                          {line.level && ` · ${line.level}`}
                          {line.context && ` · ${line.context}`}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-gray-800">
                          {line.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
