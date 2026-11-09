"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import PageContainer from "@/components/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/AdminDataTable";
import {
  ADMIN_FILTER_CONTROL,
  AdminFilterField,
  AdminFilters,
} from "@/components/admin/AdminFilters";
import { cn } from "@/lib/utils";
import { adminKeys } from "@/lib/query-keys";
import { isUuid } from "@/lib/admin-envios";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABEL,
  AUDIT_STATUS_LABEL,
  endOfDaySP,
  formatDateTimeSP,
  startOfDaySP,
} from "@/lib/admin-audit";
import {
  adminService,
  type AuditLogListParams,
  type PlatformAuditAction,
  type PlatformAuditLogItem,
} from "@/services/admin.service";
import { AuditDetailDrawer } from "./AuditDetailDrawer";

const PAGE_SIZE = 25;

const COLUMNS: AdminColumn<PlatformAuditLogItem>[] = [
  {
    key: "data",
    header: "Data",
    mobile: "subtitle",
    className: "whitespace-nowrap",
    cell: (item) => formatDateTimeSP(item.createdAt),
  },
  {
    key: "autor",
    header: "Autor",
    cell: (item) => item.actorName ?? item.actorEmail ?? "—",
  },
  {
    key: "acao",
    header: "Ação",
    mobile: "title",
    cell: (item) => AUDIT_ACTION_LABEL[item.action],
  },
  {
    key: "conta",
    header: "Conta",
    cell: (item) =>
      item.targetOwnerId ? (
        <Link
          href={`/admin/clientes/${item.targetOwnerId}`}
          className="text-teal-700 underline"
          onClick={(e) => e.stopPropagation()}
        >
          Abrir conta
        </Link>
      ) : item.targetName ? (
        <span>{item.targetName}</span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "motivo",
    header: "Motivo",
    mobile: "full",
    className: "max-w-xs truncate",
    cell: (item) => item.reason ?? "—",
  },
  {
    key: "situacao",
    header: "Situação",
    cell: (item) => AUDIT_STATUS_LABEL[item.status],
  },
];

export function AdminAuditList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<PlatformAuditLogItem | null>(null);

  const action = searchParams.get("acao") ?? "";
  const actor = searchParams.get("autor") ?? "";
  const accountParam = searchParams.get("conta") ?? "";
  const account = isUuid(accountParam) ? accountParam.trim() : "";
  const [accountInput, setAccountInput] = useState(accountParam);
  const accountInvalid = accountInput.trim() !== "" && !isUuid(accountInput);
  const from = searchParams.get("de") ?? "";
  const to = searchParams.get("ate") ?? "";
  const page = Math.max(Number(searchParams.get("pagina")) || 1, 1);

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("pagina" in changes)) next.delete("pagina");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const params: AuditLogListParams = useMemo(
    () => ({
      action: (action || undefined) as PlatformAuditAction | undefined,
      actorUserId: actor || undefined,
      targetOwnerId: account || undefined,
      from: from ? startOfDaySP(from) : undefined,
      to: to ? endOfDaySP(to) : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [action, actor, account, from, to, page],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: adminKeys.auditLogs(params),
    queryFn: () => adminService.listAuditLogs(params),
    placeholderData: (previous) => previous,
  });

  const { data: team = [] } = useQuery({
    queryKey: adminKeys.team(),
    queryFn: () => adminService.listTeam(),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <PageContainer>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="shrink-0 border-b border-neutral-100 px-3 py-3 lg:px-6">
          <h1 className="text-lg font-bold text-neutral-900">
            Histórico de ações
          </h1>
          <p className="text-xs text-neutral-500">
            Tudo o que foi feito no painel, com autor e motivo
          </p>
        </header>

        <AdminFilters
          className="items-start py-3"
          activeCount={
            [action, actor, accountParam, from, to].filter(Boolean).length
          }
          onClear={() => {
            setAccountInput("");
            updateParams({
              acao: null,
              autor: null,
              conta: null,
              de: null,
              ate: null,
            });
          }}
        >
          <AdminFilterField label="Ação">
            <select
              aria-label="Ação"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-44")}
              value={action}
              onChange={(e) => updateParams({ acao: e.target.value || null })}
            >
              <option value="">Todas as ações</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {AUDIT_ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Autor">
            <select
              aria-label="Autor"
              className={cn(ADMIN_FILTER_CONTROL, "sm:min-w-44")}
              value={actor}
              onChange={(e) => updateParams({ autor: e.target.value || null })}
            >
              <option value="">Todos os autores</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </AdminFilterField>
          <AdminFilterField label="Conta (id)">
            <div className="flex flex-col gap-1">
              <input
                aria-label="Conta (id)"
                placeholder="Conta (id)"
                aria-invalid={accountInvalid}
                className={cn(ADMIN_FILTER_CONTROL, "sm:w-72")}
                value={accountInput}
                onChange={(e) => {
                  setAccountInput(e.target.value);
                  const trimmed = e.target.value.trim();
                  if (trimmed === "") updateParams({ conta: null });
                  else if (isUuid(trimmed)) updateParams({ conta: trimmed });
                }}
              />
              {accountInvalid && (
                <p role="alert" className="text-xs text-red-600">
                  Informe o id completo da conta.
                </p>
              )}
            </div>
          </AdminFilterField>
          <AdminFilterField label="De">
            <label className="flex items-center gap-1.5 text-xs text-gray-700 md:text-sm">
              <span className="hidden sm:inline">De</span>
              <input
                type="date"
                aria-label="De"
                className={ADMIN_FILTER_CONTROL}
                value={from}
                onChange={(e) => updateParams({ de: e.target.value || null })}
              />
            </label>
          </AdminFilterField>
          <AdminFilterField label="Até">
            <label className="flex items-center gap-1.5 text-xs text-gray-700 md:text-sm">
              <span className="hidden sm:inline">Até</span>
              <input
                type="date"
                aria-label="Até"
                className={ADMIN_FILTER_CONTROL}
                value={to}
                onChange={(e) => updateParams({ ate: e.target.value || null })}
              />
            </label>
          </AdminFilterField>
        </AdminFilters>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              title="Não foi possível carregar o histórico"
              description="Tente novamente em instantes."
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Nenhuma ação encontrada"
              description="Ajuste os filtros."
            />
          ) : (
            <AdminDataTable
              rows={items}
              columns={COLUMNS}
              rowKey={(item) => item.id}
              rowLabel={(item) =>
                `Detalhes de ${AUDIT_ACTION_LABEL[item.action]}`
              }
              onRowClick={setSelected}
            />
          )}
        </div>

        {total > PAGE_SIZE && (
          <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2.5 text-xs text-gray-600 md:text-sm lg:px-6">
            <span>
              Página {page} de {lastPage} · {total} ações
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="ds-btn-inline"
                disabled={page <= 1}
                onClick={() =>
                  updateParams({
                    pagina: page - 1 > 1 ? String(page - 1) : null,
                  })
                }
              >
                Anterior
              </button>
              <button
                type="button"
                className="ds-btn-inline"
                disabled={page >= lastPage}
                onClick={() => updateParams({ pagina: String(page + 1) })}
              >
                Próxima
              </button>
            </div>
          </footer>
        )}
      </div>

      <AuditDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </PageContainer>
  );
}
