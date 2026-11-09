"use client";

import { ExternalLink, ListTree } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ERROR_SOURCE_CLASS, ERROR_SOURCE_LABEL } from "@/lib/admin-errors";
import { pluralize } from "@/lib/admin-format";
import { cn, formatDateTime } from "@/lib/utils";
import type { AdminErrorFingerprint } from "@/services/admin.service";

export function ErrorFingerprintList({
  items,
  showAccounts = true,
  onOpen,
}: {
  items: AdminErrorFingerprint[];
  showAccounts?: boolean;
  onOpen: (item: AdminErrorFingerprint) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhum erro no período"
        description="Quando a plataforma falhar, o erro aparece aqui agrupado por tipo."
      />
    );
  }
  return (
    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
      {items.map((item) => (
        <li
          key={item.fingerprint}
          className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn("ds-badge-sm", ERROR_SOURCE_CLASS[item.source])}
              >
                {ERROR_SOURCE_LABEL[item.source]}
              </span>
              {item.errorClass && (
                <span className="text-xs font-medium text-gray-500">
                  {item.errorClass}
                </span>
              )}
            </div>
            <p className="mt-1.5 break-words text-sm font-medium text-gray-900">
              {item.lastMessage ?? "Erro sem mensagem"}
            </p>
            {item.route && (
              <p className="mt-0.5 break-all font-mono text-xs text-gray-500">
                {item.route}
              </p>
            )}
            <p className="mt-1.5 text-xs text-gray-500">
              {pluralize(item.total, "ocorrência", "ocorrências")}
              {showAccounts &&
                ` · ${pluralize(item.accounts, "conta", "contas")}`}{" "}
              · última em {formatDateTime(item.lastSeenAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpen(item)}
              className="ds-toolbar-btn"
            >
              <ListTree className="h-4 w-4" aria-hidden="true" />
              Ver ocorrências
            </button>
            {item.exploreUrl && (
              <a
                href={item.exploreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ds-toolbar-btn"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Ver no Grafana
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
